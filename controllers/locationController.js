import Location from '../models/Location.js';
import mongoose from 'mongoose';

// Create a new location with latitude & longitude
export const createLocation = async (req, res) => {
  try {
    const { name, state, country, latitude, longitude } = req.body;

    const location = new Location({
      name,
      state,
      country,
      latitude,
      longitude
    });

    await location.save();
    res.status(201).json(location);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all locations
export const getAllLocations = async (req, res) => {
  try {
    const locations = await Location.find().sort({ createdAt: -1 });
    res.status(200).json(locations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single location by ID
export const getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) return res.status(404).json({ message: 'Location not found' });
    res.status(200).json(location);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a location
export const updateLocation = async (req, res) => {
  try {
    const updated = await Location.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete a location
export const deleteLocation = async (req, res) => {
  try {
    await Location.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Location deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
