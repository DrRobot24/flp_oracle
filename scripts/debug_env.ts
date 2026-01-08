
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const envPath = path.resolve(__dirname, '../.env')
console.log(`Checking .env at: ${envPath}`)

if (!fs.existsSync(envPath)) {
    console.error("❌ File .env NOT found at expected path!")
    process.exit(1)
}

const envConfig = dotenv.config({ path: envPath })

if (envConfig.error) {
    console.error("❌ Error parsing .env:", envConfig.error)
} else {
    console.log("✅ .env parsed successfully.")
    console.log("Keys found:", Object.keys(envConfig.parsed || {}))
}
