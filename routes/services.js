const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const upload = require('../middleware/upload');
const { uploadToCloudinary } = require('../utils/cloudinary');

// GET all services
router.get('/', async (req, res) => {
    try {
        // We'll populate the category and provider so the frontend gets full info
        const services = await Service.find().populate('category').populate('provider', 'name profileImage email phone');
        
        // Transform the response to match the frontend expected 'avatarUrl'
        const transformedServices = services.map(service => {
            const s = service.toObject();
            if (s.provider && s.provider.profileImage) {
                s.provider.avatarUrl = s.provider.profileImage;
            }
            return s;
        });
        
        res.status(200).json(transformedServices);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching services', error: error.message });
    }
});

// GET services by category ID
router.get('/category/:categoryId', async (req, res) => {
    try {
        const services = await Service.find({ category: req.params.categoryId })
            .populate('category')
            .populate('provider', 'name profileImage email phone');
            
        const transformedServices = services.map(service => {
            const s = service.toObject();
            if (s.provider && s.provider.profileImage) {
                s.provider.avatarUrl = s.provider.profileImage;
            }
            return s;
        });
        
        res.status(200).json(transformedServices);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching services by category', error: error.message });
    }
});

// GET single service by ID
router.get('/:id', async (req, res) => {
    try {
        const service = await Service.findById(req.params.id).populate('category');
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }
        res.status(200).json(service);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching service', error: error.message });
    }
});

// POST create service
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, upload.single('image'), async (req, res) => {
    if (req.user.role !== 'provider') {
        return res.status(403).json({ message: 'Only providers can post services' });
    }

    const { title, category, price, priceUnit, aboutService, tagline } = req.body;

    if (!title || !category || !price || !aboutService) {
        return res.status(400).json({ message: 'Missing required service fields' });
    }

    try {
        let finalImageUrl = req.body.imageUrl || ''; // Fallback to provided URL if any

        // If a file was uploaded, send it to Cloudinary
        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer);
            finalImageUrl = result.secure_url;
        }

        if (!finalImageUrl) {
            return res.status(400).json({ message: 'Please upload an image for the service' });
        }

        const service = new Service({
            title,
            category,
            price,
            priceUnit: priceUnit || 'hour',
            imageUrl: finalImageUrl,
            aboutService,
            provider: req.user._id,
            providerInfo: {
                name: req.user.name,
                avatarUrl: req.user.profileImage,
                tagline: tagline || ""
            }
        });

        const savedService = await service.save();
        res.status(201).json({ status: 'success', data: savedService });
    } catch (error) {
        res.status(500).json({ message: 'Error creating service', error: error.message });
    }
});

// GET services for a specific provider
router.get('/provider/:providerId', async (req, res) => {
    try {
        const services = await Service.find({ provider: req.params.providerId })
            .populate('category')
            .populate('provider', 'name profileImage email phone');
            
        const transformedServices = services.map(service => {
            const s = service.toObject();
            if (s.provider && s.provider.profileImage) {
                s.provider.avatarUrl = s.provider.profileImage;
            }
            return s;
        });
        
        res.status(200).json(transformedServices);
    } catch (error) {
        res.status(500).json({ status: 'fail', message: 'Error fetching services for provider', error: error.message });
    }
});

module.exports = router;
