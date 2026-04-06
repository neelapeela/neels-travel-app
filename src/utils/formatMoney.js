export const formatSignedMoney = (value) => {
  const abs = Math.abs(value).toFixed(2)
  if (value > 0) return `+$${abs}`
  if (value < 0) return `-$${abs}`
  return '$0.00'
}
