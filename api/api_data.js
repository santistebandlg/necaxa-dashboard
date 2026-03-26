export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const GAS_URL = 'https://script.google.com/macros/s/AKfycbzDDSfwYTxLDiJDiLknY9g22NCtFi8qBaZBXMMmeIQk21TryPezTS5JNw4DBWzbosnnWg/exec'

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
