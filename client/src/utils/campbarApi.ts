import axios from 'axios';
import type { Trip, TripFilters, CreateTripFormData, DateOptionFormData, GearItemFormData, SOSAlert } from './campbarTypes';

import { API_BASE_URL } from '../config';

// Create axios instance with defaults
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Important for cookies/sessions
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * CampBar API client
 * All endpoints require authentication (enforced by backend)
 */
export const campbarApi = {
    // ============================================================================
    // TRIPS
    // ============================================================================

    /**
     * Get all trips with optional filters
     * @param filters - Optional filters for status, difficulty, search
     */
    getTrips: async (filters?: TripFilters) => {
        const response = await api.get<{ success: boolean; data: Trip[] }>('/api/campbar/trips', {
            params: filters,
        });
        return response.data.data;
    },

    /**
     * Get single trip by ID with all nested data
     * @param id - Trip ID
     */
    getTrip: async (id: string) => {
        const response = await api.get<{ success: boolean; data: Trip }>(`/api/campbar/trips/${id}`);
        return response.data.data;
    },

    /**
     * Create a new trip
     * @param data - Trip creation data
     */
    createTrip: async (data: CreateTripFormData) => {
        const response = await api.post<{ success: boolean; data: Trip }>('/api/campbar/trips', data);
        return response.data.data;
    },

    /**
     * Update trip details (organizer only)
     * @param id - Trip ID
     * @param data - Fields to update
     */
    updateTrip: async (id: string, data: Partial<CreateTripFormData>) => {
        const response = await api.put<{ success: boolean; data: Trip }>(`/api/campbar/trips/${id}`, data);
        return response.data.data;
    },

    /**
     * Cancel trip (organizer only)
     * @param id - Trip ID
     */
    cancelTrip: async (id: string) => {
        const response = await api.delete<{ success: boolean; message: string }>(`/api/campbar/trips/${id}`);
        return response.data;
    },

    // ============================================================================
    // PARTICIPANTS
    // ============================================================================

    /**
     * Join a trip
     * @param id - Trip ID
     */
    joinTrip: async (id: string) => {
        const response = await api.post<{ success: boolean; data: any }>(`/api/campbar/trips/${id}/join`);
        return response.data;
    },

    /**
     * Leave a trip
     * @param id - Trip ID
     */
    leaveTrip: async (id: string) => {
        const response = await api.delete<{ success: boolean; message: string }>(`/api/campbar/trips/${id}/leave`);
        return response.data;
    },

    /**
     * Confirm attendance for a trip
     * @param id - Trip ID
     */
    confirmAttendance: async (id: string) => {
        const response = await api.post<{ success: boolean; message: string }>(
            `/api/campbar/trips/${id}/participation/confirm`
        );
        return response.data;
    },

    // ============================================================================
    // DATE VOTING
    // ============================================================================

    /**
     * Add date option for voting (organizer only)
     * @param tripId - Trip ID
     * @param dates - Date range
     */
    addDateOption: async (tripId: string, dates: DateOptionFormData) => {
        const response = await api.post<{ success: boolean; data: any }>(`/api/campbar/trips/${tripId}/dates`, dates);
        return response.data.data;
    },

    /**
     * Vote for a date option
     * @param tripId - Trip ID
     * @param dateId - Date option ID
     */
    voteDate: async (tripId: string, dateId: string) => {
        const response = await api.post<{ success: boolean; message: string }>(
            `/api/campbar/trips/${tripId}/dates/${dateId}/vote`
        );
        return response.data;
    },

    /**
     * Remove vote for a date option
     * @param tripId - Trip ID
     * @param dateId - Date option ID
     */
    unvoteDate: async (tripId: string, dateId: string) => {
        const response = await api.delete<{ success: boolean; message: string }>(
            `/api/campbar/trips/${tripId}/dates/${dateId}/vote`
        );
        return response.data;
    },

    /**
     * Confirm date option (organizer only)
     * Sets trip dates to this option and marks as confirmed
     * @param tripId - Trip ID
     * @param dateId - Date option ID to confirm
     */
    confirmDate: async (tripId: string, dateId: string) => {
        const response = await api.post<{ success: boolean; message: string }>(
            `/api/campbar/trips/${tripId}/dates/${dateId}/confirm`
        );
        return response.data;
    },

    /**
     * Delete date option (organizer only)
     * @param tripId - Trip ID
     * @param dateId - Date option ID
     */
    deleteDateOption: async (tripId: string, dateId: string) => {
        const response = await api.delete<{ success: boolean; message: string }>(
            `/api/campbar/trips/${tripId}/dates/${dateId}`
        );
        return response.data;
    },

    // ============================================================================
    // GEAR COORDINATION
    // ============================================================================

    /**
     * Add gear item to trip (organizer only)
     * @param tripId - Trip ID
     * @param gear - Gear item data
     */
    addGear: async (tripId: string, gear: GearItemFormData) => {
        const response = await api.post<{ success: boolean; data: any }>(`/api/campbar/trips/${tripId}/gear`, gear);
        return response.data.data;
    },

    /**
     * Update gear item (organizer only)
     * @param tripId - Trip ID
     * @param itemId - Gear item ID
     * @param data - Fields to update
     */
    updateGear: async (tripId: string, itemId: string, data: Partial<GearItemFormData>) => {
        const response = await api.put<{ success: boolean; data: any }>(
            `/api/campbar/trips/${tripId}/gear/${itemId}`,
            data
        );
        return response.data.data;
    },

    /**
     * Volunteer to bring a gear item
     * @param tripId - Trip ID
     * @param itemId - Gear item ID
     */
    volunteerGear: async (tripId: string, itemId: string) => {
        const response = await api.post<{ success: boolean; message: string }>(
            `/api/campbar/trips/${tripId}/gear/${itemId}/volunteer`
        );
        return response.data;
    },

    /**
     * Delete gear item (organizer only)
     * @param tripId - Trip ID
     * @param itemId - Gear item ID
     */
    deleteGear: async (tripId: string, itemId: string) => {
        const response = await api.delete<{ success: boolean; message: string }>(
            `/api/campbar/trips/${tripId}/gear/${itemId}`
        );
        return response.data;
    },

    // ============================================================================
    // MESSAGING
    // ============================================================================

    /**
     * Get trip messages
     * @param tripId - Trip ID
     */
    getMessages: async (tripId: string) => {
        const response = await api.get<{ success: boolean; data: any[] }>(`/api/campbar/trips/${tripId}/messages`);
        return response.data.data;
    },

    /**
     * Send a message to trip chat
     * @param tripId - Trip ID
     * @param message - Message text
     */
    sendMessage: async (tripId: string, message: string) => {
        const response = await api.post<{ success: boolean; data: any }>(`/api/campbar/trips/${tripId}/messages`, {
            message,
        });
        return response.data.data;
    },

    /**
     * Update trip status (organizer only)
     * @param tripId - Trip ID
     * @param status - New status
     */
    updateTripStatus: async (id: string, status: 'ongoing' | 'completed') => {
        const response = await api.patch<{ success: boolean; data: Trip }>(`/api/campbar/trips/${id}/status`, { status });
        return response.data.data;
    },
    // ============================================================================
    // SAFETY / SOS
    // ============================================================================

    /**
     * Send SOS Alert
     * @param tripId - Trip ID
     * @param data - SOS Data
     */
    sendSOS: async (tripId: string, data: SOSAlert) => {
        const response = await api.post<{ success: boolean; message: string }>(
            `/api/campbar/trips/${tripId}/sos`,
            data
        );
        return response.data;
    },

    /**
     * Get active SOS alerts for a trip
     * @param tripId - Trip ID
     */
    getActiveSOS: async (tripId: string) => {
        const response = await api.get<{ success: boolean; alerts: any[] }>(
            `/api/campbar/trips/${tripId}/sos/active`
        );
        return response.data.alerts;
    },

    /**
     * Resolve an SOS alert
     * @param tripId - Trip ID
     * @param alertId - Alert ID
     */
    resolveSOS: async (tripId: string, alertId: string) => {
        const response = await api.post<{ success: boolean; message: string }>(
            `/api/campbar/trips/${tripId}/sos/${alertId}/resolve`
        );
        return response.data;
    },
};

export default campbarApi;
