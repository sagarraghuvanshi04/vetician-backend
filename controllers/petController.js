
const Pet = require('../models/Pet');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Register pet
const createPet = catchAsync(async (req, res, next) => {
  const { name, species, gender, userId } = req.body;
  console.log('Creating pet with data:', req.body);

  // Validate required fields
  if (!name || !species || !gender) {
    return next(new AppError('Name, species and gender are required', 400));
  }

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  // Create new pet with all provided data
  const pet = new Pet({
    ...req.body,
    userId
  });

  await pet.save();

  res.status(201).json({
    success: true,
    message: 'Pet created successfully',
    pet: pet
  });
});

// registered pet info
const getPetsByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params; 
  console.log("getPetsByUserId =>",userId)

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  const pets = await Pet.find({ userId });

  if (!pets || pets.length === 0) {
    return res.status(200).json({
      success: true,
      message: 'No pets found for this user',
      pets: []
    });
  }

  res.status(200).json({
    success: true,
    message: 'Pets retrieved successfully',
    pets: pets
  });
});

module.exports={
    createPet,
    getPetsByUserId
}