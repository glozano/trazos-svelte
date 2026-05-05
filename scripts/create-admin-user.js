import { MongoClient } from 'mongodb'
import { randomBytes, scrypt as scryptCallback } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

const [username, password] = process.argv.slice(2)

if (!username || !password) {
    console.error('Usage: npm run admin:user -- <username> <password>')
    process.exit(1)
}

const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017'
const dbName = process.env.MONGO_DB_NAME || 'mongo_trazos'

main().catch((err) => {
    console.error(err)
    process.exit(1)
})

async function main() {
    const salt = randomBytes(16).toString('hex')
    const hash = await scrypt(password, salt, 64)
    const passwordHash = `${salt}:${hash.toString('hex')}`
    const client = new MongoClient(mongoUrl)

    try {
        await client.connect()
        const db = client.db(dbName)
        await db.collection('admin_users').createIndex({ username: 1 }, { unique: true })
        await db.collection('admin_users').updateOne(
            { username },
            {
                $set: {
                    username,
                    passwordHash,
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    createdAt: new Date()
                }
            },
            { upsert: true }
        )
        console.log(`Admin user "${username}" is ready in ${dbName}.admin_users`)
    } finally {
        await client.close()
    }
}
