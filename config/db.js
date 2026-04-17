const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // ✅ Check env
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in .env');
        }

        console.log('📡 Connecting to MongoDB...');

        // Hide password in logs
        const safeURI = process.env.MONGODB_URI.replace(
            /\/\/([^:]+):([^@]+)@/,
            '//***:***@'
        );
        console.log('Connection string:', safeURI);

        // ✅ Connect (Mongoose v6+ no extra options needed)
        const conn = await mongoose.connect(process.env.MONGODB_URI);

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Database Name: ${conn.connection.name}`);

        // ✅ Connection events
        mongoose.connection.on('connected', () => {
            console.log('🟢 Mongoose connected');
        });

        mongoose.connection.on('error', (err) => {
            console.error('🔴 Mongoose error:', err.message);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('🟡 Mongoose disconnected');
        });

    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);

        // 🔍 Smart debugging messages
        if (error.message.includes('ECONNREFUSED')) {
            console.error('👉 DNS/Network issue (very common)');
            console.error('✔ Try: mobile hotspot OR change DNS to 8.8.8.8');
        } else if (error.message.includes('Authentication failed')) {
            console.error('👉 ভুল username/password (check MongoDB Atlas user)');
        } else if (error.message.includes('ENOTFOUND')) {
            console.error('👉 Cluster URL ভুল অথবা DNS problem');
        } else if (error.message.includes('timed out')) {
            console.error('👉 IP not whitelisted (add 0.0.0.0/0 in Atlas)');
        }

        // ❌ Stop app if DB fails (important)
        process.exit(1);
    }
};

module.exports = connectDB;