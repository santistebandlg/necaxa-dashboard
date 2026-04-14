export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const GAS_URL = 'https://script.google.com/macros/s/AKfycby0kD2Jrr5qTJoxLzOz22Nh0ftNXnhns4pJZfiFM-iJL7h9aHRZqHaa6cP00XgEXsVB0w/exec'

  try {
    const response = await fetch(`${GAS_URL}?action=all`, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const text = await response.text()
    res.setHeader('Content-Type', 'application/json')
    res.status(200).send(text)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
