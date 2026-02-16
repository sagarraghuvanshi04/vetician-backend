// Test Registration Flow
// Run this after creating accounts to verify data is in correct collections

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Parent = require('./models/Parent');
const Paravet = require('./models/Paravet');
const PetResort = require('./models/PetResort');
const Veterinarian = require('./models/Veterinarian');

async function checkRegistrations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const users = await User.find().select('name email role');
    console.log('\n📊 Users in database:', users.length);
    
    for (const user of users) {
      console.log(`\n👤 User: ${user.name} (${user.email}) - Role: ${user.role}`);
      
      if (user.role === 'pet_parent') {
        const parent = await Parent.findOne({ user: user._id });
        console.log(`   ${parent ? '✅' : '❌'} Parent entry: ${parent ? parent._id : 'NOT FOUND'}`);
      } else if (user.role === 'paravet') {
        const paravet = await Paravet.findOne({ userId: user._id.toString() });
        console.log(`   ${paravet ? '✅' : '❌'} Paravet entry: ${paravet ? paravet._id : 'NOT FOUND'}`);
      } else if (user.role === 'veterinarian') {
        const vet = await Veterinarian.findOne({ userId: user._id.toString() });
        console.log(`   ${vet ? '✅' : '❌'} Veterinarian entry: ${vet ? vet._id : 'NOT FOUND'}`);
      } else if (user.role === 'pet_resort') {
        const resort = await PetResort.findOne({ userId: user._id });
        console.log(`   ${resort ? '✅' : '❌'} PetResort entry: ${resort ? resort._id : 'NOT FOUND'}`);
      }
    }

    console.log('\n📈 Collection Counts:');
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   Parents: ${await Parent.countDocuments()}`);
    console.log(`   Paravets: ${await Paravet.countDocuments()}`);
    console.log(`   Veterinarians: ${await Veterinarian.countDocuments()}`);
    console.log(`   Pet Resorts: ${await PetResort.countDocuments()}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkRegistrations();
