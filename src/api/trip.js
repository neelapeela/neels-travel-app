import { doc, setDoc, getDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase"; // Your Firestore instance
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates an array of dates between start and end date (inclusive)
 * @param {string} startDate - Start date string (YYYY-MM-DD)
 * @param {string} endDate - End date string (YYYY-MM-DD)
 * @returns {Array<string>} - Array of date strings in YYYY-MM-DD format
 */
export const getDatesBetween = (startDate, endDate) => {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Loop through each day
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    // Format as YYYY-MM-DD
    const dateString = date.toISOString().split('T')[0];
    dates.push(dateString);
  }
  
  return dates;
};

/**
 * Geocodes a location name to coordinates using Nominatim API
 * @param {string} locationName - Name of the location (e.g., "Paris, France")
 * @returns {Promise<{lat: number, lon: number} | null>} - Coordinates or null if not found
 */
export const geocodeLocation = async (locationName) => {
  if (!locationName) return null;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`,
      {
        headers: {
          'User-Agent': 'Travel App' // Required by Nominatim
        }
      }
    );

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }

    return null;
  } catch (error) {
    console.error('Error geocoding location:', error);
    return null;
  }
};

export const getTripById = async (tripId) => {
  if (!tripId) return null;
  const tripRef = doc(db, "trips", tripId);
  const tripSnap = await getDoc(tripRef);
  return tripSnap.exists() ? tripSnap.data() : null;
};

export const getTripsForUser = async (userId) => {
  if (!userId) return [];
  
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const trips = userData.trips || [];
      let tripsData = [];
      for (const tripId of trips) {
        const tripRef = doc(db, "trips", tripId);
        const tripSnap = await getDoc(tripRef);
        if (tripSnap.exists()) {
          tripsData.push(tripSnap.data());
        }
      }
      return tripsData;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching trips:', error);
    throw error;
  }
};

export const createTripForUser = async (userId, tripData) => {
  if (!userId) throw new Error('User ID is required');
  if (!tripData.name || !tripData.destination) {
    throw new Error('Trip name and destination are required');
  }

  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User document does not exist');
    }

    // Generate itinerary dates between start and end date
    const dates = getDatesBetween(tripData.startDate, tripData.endDate);
    const itinerary = dates.map(date => ({
      date: date,
      stops: []
    }));

    // Create new trip object with ID
    const newTrip = {
      id: uuidv4(), // Simple ID generation (or use UUID)
      name: tripData.name,
      travelers: [userId],
      destination: tripData.destination,
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      description: tripData.description || '',
      itinerary: itinerary,
      createdAt: new Date().toISOString(), // Use regular date instead of serverTimestamp
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, "trips", newTrip.id), newTrip);
    await updateDoc(userRef, {
      trips: arrayUnion(newTrip.id)
    });

    return newTrip.id;
  } catch (error) {
    console.error('Error creating trip:', error);
    throw error;
  }
};