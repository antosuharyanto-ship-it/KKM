import express, { Request, Response } from 'express';
import { db } from '../db';
import {
    tripBoards,
    tripParticipants,
    tripDateVotes,
    tripDateUserVotes,
    tripGearItems,
    tripMessages,
    users
} from '../db/schema';
import { eq, and, desc, or, sql, gte } from 'drizzle-orm';
import { checkAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as v from '../validators/campbarValidators';
import { ticketService } from '../services/ticketService';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Helper: Safely extract param as string (Express params can be string[] in edge cases)
const getParam = (value: string | string[]): string => Array.isArray(value) ? value[0] : value;

// All routes require authentication
router.use(checkAuth);

// ============================================================================
// TRIP BOARDS - CRUD
// ============================================================================

/**
 * GET /api/campbar/trips
 * Browse all available trips with filters
 */
router.get('/trips', async (req: Request, res: Response) => {
    try {
        const {
            status = 'all',
            difficulty,
            destination,
            limit = 20,
            offset = 0
        } = req.query;

        let query = db
            .select({
                id: tripBoards.id,
                title: tripBoards.title,
                description: tripBoards.description,
                destination: tripBoards.destination,
                difficulty: tripBoards.difficulty,
                tripType: tripBoards.tripType,
                maxParticipants: tripBoards.maxParticipants,
                currentParticipants: tripBoards.currentParticipants,
                status: tripBoards.status,
                startDate: tripBoards.startDate,
                endDate: tripBoards.endDate,
                datesConfirmed: tripBoards.datesConfirmed,
                meetingPoint: tripBoards.meetingPoint,
                meetingTime: tripBoards.meetingTime,
                createdAt: tripBoards.createdAt,
                organizerId: tripBoards.organizerId,
                organizerName: users.fullName,
                organizerEmail: users.email
            })
            .from(tripBoards)
            .leftJoin(users, eq(tripBoards.organizerId, users.id))
            .orderBy(desc(tripBoards.createdAt));

        // Apply filters
        const filters = [];
        if (status && status !== 'all') {
            filters.push(eq(tripBoards.status, status as 'planning' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled'));
        }
        if (difficulty) {
            filters.push(eq(tripBoards.difficulty, difficulty as 'easy' | 'moderate' | 'hard' | 'expert'));
        }
        if (destination) {
            filters.push(sql`${tripBoards.destination} ILIKE ${`%${destination}%`}`);
        }

        if (filters.length > 0) {
            query = query.where(and(...filters)) as any;
        }

        const trips = await query.limit(Number(limit)).offset(Number(offset));

        res.json({ success: true, data: trips, total: trips.length });
    } catch (error) {
        console.error('[CampBar] Error fetching trips:', error);
        res.status(500).json({ error: 'Failed to fetch trips' });
    }
});

/**
 * GET /api/campbar/trips/:id
 * Get single trip details with all related data
 */
router.get('/trips/:id', validate(v.tripIdParamSchema, 'params'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };

        // Get trip details
        const trip = await db
            .select({
                id: tripBoards.id,
                title: tripBoards.title,
                description: tripBoards.description,
                destination: tripBoards.destination,
                difficulty: tripBoards.difficulty,
                tripType: tripBoards.tripType,
                maxParticipants: tripBoards.maxParticipants,
                currentParticipants: tripBoards.currentParticipants,
                status: tripBoards.status,
                startDate: tripBoards.startDate,
                endDate: tripBoards.endDate,
                datesConfirmed: tripBoards.datesConfirmed,
                meetingPoint: tripBoards.meetingPoint,
                meetingTime: tripBoards.meetingTime,
                createdAt: tripBoards.createdAt,
                organizerId: tripBoards.organizerId,
                organizerName: users.fullName,
                organizerEmail: users.email
            })
            .from(tripBoards)
            .leftJoin(users, eq(tripBoards.organizerId, users.id))
            .where(eq(tripBoards.id, getParam(id)))
            .limit(1);

        if (trip.length === 0) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        // Get participants
        const participantsRaw = await db
            .select({
                id: tripParticipants.id,
                userId: tripParticipants.userId,
                status: tripParticipants.status,
                joinedAt: tripParticipants.joinedAt,
                userName: users.fullName,
                userEmail: users.email,
                userPicture: users.picture
            })
            .from(tripParticipants)
            .leftJoin(users, eq(tripParticipants.userId, users.id))
            .where(eq(tripParticipants.tripId, getParam(id)));

        const participants = participantsRaw.map(p => ({
            id: p.id,
            userId: p.userId,
            status: p.status,
            joinedAt: p.joinedAt,
            user: {
                id: p.userId,
                name: p.userName,
                email: p.userEmail,
                picture: p.userPicture
            }
        }));

        // Get date options with votes
        console.log('[DEBUG GET] Fetching date options for tripId:', id);
        const dateOptions = await db
            .select()
            .from(tripDateVotes)
            .where(eq(tripDateVotes.tripId, getParam(id)))
            .orderBy(desc(tripDateVotes.voteCount));

        console.log('[DEBUG GET] Found', dateOptions.length, 'date options');
        if (dateOptions.length > 0) {
            console.log('[DEBUG GET] First date option:', JSON.stringify(dateOptions[0]));
        }

        // Get gear items
        const gearItems = await db
            .select({
                id: tripGearItems.id,
                itemName: tripGearItems.itemName,
                quantity: tripGearItems.quantity,
                assignedTo: tripGearItems.assignedTo,
                isCovered: tripGearItems.isCovered,
                assignedUserName: users.fullName
            })
            .from(tripGearItems)
            .leftJoin(users, eq(tripGearItems.assignedTo, users.id))
            .where(eq(tripGearItems.tripId, getParam(id)));

        // Get recent messages
        const messagesRaw = await db
            .select({
                id: tripMessages.id,
                message: tripMessages.message,
                createdAt: tripMessages.createdAt,
                userId: tripMessages.userId,
                userName: users.fullName,
                userPicture: users.picture
            })
            .from(tripMessages)
            .leftJoin(users, eq(tripMessages.userId, users.id))
            .where(eq(tripMessages.tripId, getParam(id)))
            .orderBy(desc(tripMessages.createdAt))
            .limit(50);

        const messages = messagesRaw.reverse().map(msg => ({
            id: msg.id,
            message: msg.message,
            createdAt: msg.createdAt,
            userId: msg.userId,
            user: {
                id: msg.userId,
                name: msg.userName,
                picture: msg.userPicture
            }
        }));

        // Debug: Log what we're sending back
        console.log('[DEBUG GET] Date options from DB:', JSON.stringify(dateOptions, null, 2));

        res.json({
            success: true,
            data: {
                ...trip[0],
                participants,
                dateOptions,
                gearItems,
                messages
            }
        });
    } catch (error) {
        console.error('[CampBar] Error fetching trip detail:', error);
        res.status(500).json({ error: 'Failed to fetch trip details' });
    }
});

/**
 * POST /api/campbar/trips
 * Create new trip
 */
router.post('/trips', validate(v.createTripSchema, 'body'), async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

        const {
            title,
            description,
            destination,
            difficulty = 'moderate',
            tripType = 'camping',
            maxParticipants = 10,
            dateOptions = [] // Array of {startDate, endDate}
        } = req.body;

        // Validation
        if (!title || !destination) {
            return res.status(400).json({ error: 'Title and destination are required' });
        }

        // Create trip
        const newTrip = await db
            .insert(tripBoards)
            .values({
                organizerId: req.user.id,
                title,
                description,
                destination,
                difficulty,
                tripType,
                maxParticipants: Number(maxParticipants),
                currentParticipants: 1, // Organizer counts
                status: 'planning'
            })
            .returning();

        const tripId = newTrip[0].id;

        // Auto-add organizer as participant
        await db.insert(tripParticipants).values({
            tripId,
            userId: req.user.id,
            status: 'confirmed'
        });

        // Add initial date options if provided
        if (dateOptions && Array.isArray(dateOptions) && dateOptions.length > 0) {
            const dateVotes = dateOptions.map((option: any) => ({
                tripId,
                startDate: option.startDate, // Already YYYY-MM-DD string
                endDate: option.endDate,     // Already YYYY-MM-DD string
                voteCount: 0,
                createdBy: req.user!.id
            }));
            await db.insert(tripDateVotes).values(dateVotes);
        }

        res.status(201).json({ success: true, data: newTrip[0] });
    } catch (error) {
        console.error('[CampBar] Error creating trip:', error);
        res.status(500).json({ error: 'Failed to create trip' });
    }
});

/**
 * PUT /api/campbar/trips/:id
 * Update trip (organizer only)
 */
router.put('/trips/:id', validate(v.tripIdParamSchema, 'params'), validate(v.updateTripSchema, 'body'), async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { id } = req.params as { id: string };

        // Check if user is organizer
        const trip = await db.select().from(tripBoards).where(eq(tripBoards.id, getParam(id))).limit(1);
        if (trip.length === 0) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        if (trip[0].organizerId !== req.user.id) {
            return res.status(403).json({ error: 'Only organizer can update trip' });
        }

        const updates = req.body;
        const cleanUpdates: any = {};

        // Allow updating certain fields
        if (updates.title) cleanUpdates.title = updates.title;
        if (updates.description !== undefined) cleanUpdates.description = updates.description;
        if (updates.destination) cleanUpdates.destination = updates.destination;
        if (updates.difficulty) cleanUpdates.difficulty = updates.difficulty;
        if (updates.maxParticipants) cleanUpdates.maxParticipants = Number(updates.maxParticipants);
        if (updates.meetingPoint !== undefined) cleanUpdates.meetingPoint = updates.meetingPoint;
        if (updates.meetingTime) cleanUpdates.meetingTime = new Date(updates.meetingTime);
        if (updates.status) cleanUpdates.status = updates.status;

        cleanUpdates.updatedAt = new Date();

        const updatedTrip = await db
            .update(tripBoards)
            .set(cleanUpdates)
            .where(eq(tripBoards.id, getParam(id)))
            .returning();

        res.json({ success: true, data: updatedTrip[0] });
    } catch (error) {
        console.error('[CampBar] Error updating trip:', error);
        res.status(500).json({ error: 'Failed to update trip' });
    }
});

/**
 * DELETE /api/campbar/trips/:id
 * Cancel trip (organizer only)
 */
router.delete('/trips/:id', async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { id } = req.params;

        // Check if user is organizer
        const trip = await db.select().from(tripBoards).where(eq(tripBoards.id, getParam(id))).limit(1);
        if (trip.length === 0) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        if (trip[0].organizerId !== req.user.id) {
            return res.status(403).json({ error: 'Only organizer can cancel trip' });
        }

        // Soft delete by changing status
        await db
            .update(tripBoards)
            .set({ status: 'cancelled', updatedAt: new Date() })
            .where(eq(tripBoards.id, getParam(id)));

        res.json({ success: true, message: 'Trip cancelled successfully' });
    } catch (error) {
        console.error('[CampBar] Error cancelling trip:', error);
        res.status(500).json({ error: 'Failed to cancel trip' });
    }
});

// ============================================================================
// PARTICIPANTS
// ============================================================================

/**
 * POST /api/campbar/trips/:id/join
 * Join a trip
 */
router.post('/trips/:id/join', async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { id } = req.params;

        // Check if trip exists and has space
        const trip = await db.select().from(tripBoards).where(eq(tripBoards.id, getParam(id))).limit(1);
        if (trip.length === 0) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        if (trip[0].currentParticipants! >= trip[0].maxParticipants!) {
            return res.status(400).json({ error: 'Trip is full' });
        }

        // Check if already joined
        const existing = await db
            .select()
            .from(tripParticipants)
            .where(and(
                eq(tripParticipants.tripId, getParam(id)),
                eq(tripParticipants.userId, req.user.id)
            ))
            .limit(1);

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Already joined this trip' });
        }

        // Generate Ticket if trip is already confirmed
        let ticketCode = null;
        let ticketUrl = null;

        if (trip[0].status === 'confirmed' || trip[0].status === 'ongoing') {
            const user = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);

            // Format: EVT-RANDOM-USERINIT
            const shortUuid = uuidv4().split('-')[0].toUpperCase();
            ticketCode = `TIX-${shortUuid}`;

            const ticketData = {
                ticketCode,
                trip: {
                    title: trip[0].title,
                    destination: trip[0].destination || 'TBA',
                    startDate: trip[0].startDate,
                    endDate: trip[0].endDate,
                    location: trip[0].meetingPoint || trip[0].destination || 'TBA'
                },
                user: {
                    fullName: user[0].fullName,
                    email: user[0].email
                },
                bookingDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            };

            try {
                ticketUrl = await ticketService.generateTicket(ticketData);
                console.log(`[CampBar] Ticket generated for ${req.user.id}: ${ticketUrl}`);
            } catch (err) {
                console.error('[CampBar] Failed to generate ticket on join:', err);
                // Don't fail the join, but log it
            }
        }

        // Add participant
        await db.insert(tripParticipants).values({
            tripId: getParam(id),
            userId: req.user.id,
            status: 'interested',
            ticketCode,
            ticketUrl
        });

        // Increment participant count
        await db
            .update(tripBoards)
            .set({
                currentParticipants: sql`${tripBoards.currentParticipants} + 1`,
                updatedAt: new Date()
            })
            .where(eq(tripBoards.id, getParam(id)));

        res.json({ success: true, message: 'Joined trip successfully', ticketUrl });
    } catch (error) {
        console.error('[CampBar] Error joining trip:', error);
        res.status(500).json({ error: 'Failed to join trip' });
    }
});

/**
 * DELETE /api/campbar/trips/:id/leave
 * Leave a trip
 */
router.delete('/trips/:id/leave', async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { id } = req.params;

        // Check if participant
        const participant = await db
            .select()
            .from(tripParticipants)
            .where(and(
                eq(tripParticipants.tripId, getParam(id)),
                eq(tripParticipants.userId, req.user.id)
            ))
            .limit(1);

        if (participant.length === 0) {
            return res.status(400).json({ error: 'Not a participant of this trip' });
        }

        // Check if organizer
        const trip = await db.select().from(tripBoards).where(eq(tripBoards.id, getParam(id))).limit(1);
        if (trip[0].organizerId === req.user.id) {
            return res.status(400).json({ error: 'Organizer cannot leave trip. Cancel it instead.' });
        }

        // Remove participant
        await db
            .delete(tripParticipants)
            .where(and(
                eq(tripParticipants.tripId, getParam(id)),
                eq(tripParticipants.userId, req.user.id)
            ));

        // Decrement participant count
        await db
            .update(tripBoards)
            .set({
                currentParticipants: sql`${tripBoards.currentParticipants} - 1`,
                updatedAt: new Date()
            })
            .where(eq(tripBoards.id, getParam(id)));

        res.json({ success: true, message: 'Left trip successfully' });
    } catch (error) {
        console.error('[CampBar] Error leaving trip:', error);
        res.status(500).json({ error: 'Failed to leave trip' });
    }
});

// ============================================================================
// DATE VOTING
// ============================================================================

/**
 * POST /api/campbar/trips/:id/dates
 * Add date option (organizer only)
 */
router.post('/trips/:tripId/dates', validate(v.addDateOptionSchema, 'body'), async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { tripId } = req.params as { tripId: string };
        const { startDate, endDate } = req.body;

        // Check if organizer
        const trip = await db.select().from(tripBoards).where(eq(tripBoards.id, tripId)).limit(1);
        if (trip.length === 0) return res.status(404).json({ error: 'Trip not found' });
        if (trip[0].organizerId !== req.user.id) {
            return res.status(403).json({ error: 'Only organizer can add date options' });
        }

        if (trip[0].datesConfirmed) {
            return res.status(400).json({ error: 'Dates already confirmed' });
        }



        // Debug: Log raw input
        console.log('[DEBUG POST] tripId:', tripId);
        console.log('[DEBUG POST] Date strings (YYYY-MM-DD):', { startDate, endDate });

        const newDateOption = await db
            .insert(tripDateVotes)
            .values({
                tripId,
                startDate, // Pass YYYY-MM-DD string directly
                endDate,   // Pass YYYY-MM-DD string directly
                voteCount: 0,
                createdBy: req.user.id
            })
            .returning();

        console.log('[DEBUG POST] Inserted successfully:', newDateOption[0]);

        res.status(201).json({ success: true, data: newDateOption[0] });
    } catch (error) {
        console.error('[CampBar] Error adding date option:', error);
        res.status(500).json({ error: 'Failed to add date option' });
    }
});

/**
 * POST /api/campbar/trips/:tripId/dates/:dateId/vote
 * Vote on a date option
 */
router.post('/trips/:tripId/dates/:dateId/vote', async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { tripId, dateId } = req.params;
        const trip_id = getParam(tripId);

        // Check if participant
        const participant = await db
            .select()
            .from(tripParticipants)
            .where(and(
                eq(tripParticipants.tripId, trip_id),
                eq(tripParticipants.userId, req.user.id)
            ))
            .limit(1);

        if (participant.length === 0) {
            return res.status(403).json({ error: 'Only participants can vote' });
        }

        // Check if already voted
        const date_id = getParam(dateId);
        const existingVote = await db
            .select()
            .from(tripDateUserVotes)
            .where(and(
                eq(tripDateUserVotes.dateOptionId, date_id),
                eq(tripDateUserVotes.userId, req.user.id)
            ))
            .limit(1);

        if (existingVote.length > 0) {
            return res.status(400).json({ error: 'Already voted for this date' });
        }

        // Add vote
        await db.insert(tripDateUserVotes).values({
            userId: req.user.id,
            dateOptionId: getParam(dateId)
        });

        // Increment vote count
        await db
            .update(tripDateVotes)
            .set({ voteCount: sql`${tripDateVotes.voteCount} + 1` })
            .where(eq(tripDateVotes.id, date_id));

        res.json({ success: true, message: 'Vote recorded' });
    } catch (error) {
        console.error('[CampBar] Error voting:', error);
        res.status(500).json({ error: 'Failed to record vote' });
    }
});

/**
 * DELETE /api/campbar/trips/:tripId/dates/:dateId/vote
 * Remove vote
 */
router.delete('/trips/:tripId/dates/:dateId/vote', async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { dateId } = req.params;
        const date_id = getParam(dateId);

        // Remove vote
        const result = await db
            .delete(tripDateUserVotes)
            .where(and(
                eq(tripDateUserVotes.dateOptionId, date_id),
                eq(tripDateUserVotes.userId, req.user.id)
            ))
            .returning();

        if (result.length === 0) {
            return res.status(404).json({ error: 'Vote not found' });
        }

        // Decrement vote count
        await db
            .update(tripDateVotes)
            .set({ voteCount: sql`${tripDateVotes.voteCount} - 1` })
            .where(eq(tripDateVotes.id, date_id));

        res.json({ success: true, message: 'Vote removed' });
    } catch (error) {
        console.error('[CampBar] Error removing vote:', error);
        res.status(500).json({ error: 'Failed to remove vote' });
    }
});

/**
 * DELETE /api/campbar/trips/:tripId/dates/:dateId
 * Delete date option (organizer only)
 */
router.delete('/trips/:tripId/dates/:dateId', async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { tripId, dateId } = req.params;
        const trip_id = getParam(tripId);
        const date_id = getParam(dateId);

        // Check if organizer
        const trip = await db.select().from(tripBoards).where(eq(tripBoards.id, trip_id)).limit(1);
        if (trip.length === 0) return res.status(404).json({ error: 'Trip not found' });
        if (trip[0].organizerId !== req.user.id) {
            return res.status(403).json({ error: 'Only organizer can delete date options' });
        }

        // Delete date option
        const result = await db
            .delete(tripDateVotes)
            .where(eq(tripDateVotes.id, date_id))
            .returning();

        if (result.length === 0) {
            return res.status(404).json({ error: 'Date option not found' });
        }

        res.json({ success: true, message: 'Date option deleted' });
    } catch (error) {
        console.error('[CampBar] Error deleting date option:', error);
        res.status(500).json({ error: 'Failed to delete date option' });
    }
});

/**
 * POST /api/campbar/trips/:tripId/dates/:dateId/confirm
 * Confirm final date (organizer only)
 */
router.post('/trips/:tripId/dates/:dateId/confirm', async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { tripId, dateId } = req.params;
        const trip_id = getParam(tripId);
        const date_id = getParam(dateId);

        // Check if organizer
        const trip = await db.select().from(tripBoards).where(eq(tripBoards.id, trip_id)).limit(1);
        if (trip.length === 0) return res.status(404).json({ error: 'Trip not found' });
        if (trip[0].organizerId !== req.user.id) {
            return res.status(403).json({ error: 'Only organizer can confirm dates' });
        }

        // Get selected date
        const dateOption = await db.select().from(tripDateVotes).where(eq(tripDateVotes.id, date_id)).limit(1);
        if (dateOption.length === 0) {
            return res.status(404).json({ error: 'Date option not found' });
        }

        // Update trip with final dates (convert date strings to Date objects for timestamp columns)
        const updatedTripRaw = await db
            .update(tripBoards)
            .set({
                startDate: new Date(dateOption[0].startDate!),
                endDate: new Date(dateOption[0].endDate!),
                datesConfirmed: true,
                status: 'confirmed',
                updatedAt: new Date()
            })
            .where(eq(tripBoards.id, trip_id))
            .returning();

        // --- GENERATE TICKETS FOR ALL PARTICIPANTS ---
        const participants = await db
            .select({
                id: tripParticipants.id,
                userId: tripParticipants.userId,
                email: users.email,
                fullName: users.fullName
            })
            .from(tripParticipants)
            .leftJoin(users, eq(tripParticipants.userId, users.id))
            .where(eq(tripParticipants.tripId, trip_id));

        console.log(`[CampBar] Generating tickets for ${participants.length} participants...`);

        // Process in background to avoid timeout, or await if critical?
        // Let's await to ensure it's done for this MVP flow.
        const tripData = {
            title: trip[0].title,
            destination: trip[0].destination || 'TBA',
            startDate: updatedTripRaw[0].startDate,
            endDate: updatedTripRaw[0].endDate,
            location: trip[0].meetingPoint || trip[0].destination || 'TBA'
        };

        for (const p of participants) {
            try {
                const shortUuid = uuidv4().split('-')[0].toUpperCase();
                const ticketCode = `TIX-${shortUuid}`;
                const bookingDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

                const ticketUrl = await ticketService.generateTicket({
                    ticketCode,
                    trip: tripData,
                    user: { fullName: p.fullName, email: p.email || '' },
                    bookingDate
                });

                await db
                    .update(tripParticipants)
                    .set({ ticketCode, ticketUrl })
                    .where(eq(tripParticipants.id, p.id));

            } catch (err) {
                console.error(`[CampBar] Failed to generate ticket for participant ${p.id}:`, err);
            }
        }

        res.json({ success: true, message: 'Date confirmed and tickets generated' });
    } catch (error) {
        console.error('[CampBar] Error confirming date:', error);
        res.status(500).json({ error: 'Failed to confirm date' });
    }
});

// ============================================================================
/**
 * PATCH /api/campbar/trips/:id/status
 * Update trip status (organizer only)
 */
router.patch('/trips/:id/status', async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { id } = req.params;
        const { status } = req.body;
        const trip_id = getParam(id);

        if (!['ongoing', 'completed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Check organizer
        const trip = await db.select().from(tripBoards).where(eq(tripBoards.id, trip_id)).limit(1);
        if (trip.length === 0) return res.status(404).json({ error: 'Trip not found' });
        if (trip[0].organizerId !== req.user.id) {
            return res.status(403).json({ error: 'Only organizer can update status' });
        }

        // Update status
        const updated = await db
            .update(tripBoards)
            .set({ status, updatedAt: new Date() })
            .where(eq(tripBoards.id, trip_id))
            .returning();

        res.json({ success: true, data: updated[0] });
    } catch (error) {
        console.error('[CampBar] Error updating status:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// ============================================================================
// GEAR COORDINATION
// ============================================================================

/**
 * GET /api/campbar/trips/:id/gear
 * Get gear list
 */
router.get('/trips/:id/gear', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const gear = await db
            .select({
                id: tripGearItems.id,
                itemName: tripGearItems.itemName,
                quantity: tripGearItems.quantity,
                assignedTo: tripGearItems.assignedTo,
                isCovered: tripGearItems.isCovered,
                assignedUserName: users.fullName
            })
            .from(tripGearItems)
            .leftJoin(users, eq(tripGearItems.assignedTo, users.id))
            .where(eq(tripGearItems.tripId, getParam(id)));

        res.json({ success: true, data: gear });
    } catch (error) {
        console.error('[CampBar] Error fetching gear:', error);
        res.status(500).json({ error: 'Failed to fetch gear list' });
    }
});

/**
 * POST /api/campbar/trips/:id/gear
 * Add gear item (participants only)
 */
router.post('/trips/:id/gear', validate(v.addGearItemSchema, 'body'), async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { id } = req.params as { id: string };
        const { itemName, quantity = 1 } = req.body;

        // Check if participant
        const participant = await db
            .select()
            .from(tripParticipants)
            .where(and(
                eq(tripParticipants.tripId, getParam(id)),
                eq(tripParticipants.userId, req.user.id)
            ))
            .limit(1);

        if (participant.length === 0) {
            return res.status(403).json({ error: 'Only participants can add gear' });
        }

        const newGear = await db
            .insert(tripGearItems)
            .values({
                tripId: id,
                itemName,
                quantity: Number(quantity),
                isCovered: false
            })
            .returning();

        res.status(201).json({ success: true, data: newGear[0] });
    } catch (error) {
        console.error('[CampBar] Error adding gear:', error);
        res.status(500).json({ error: 'Failed to add gear item' });
    }
});

/**
 * PUT /api/campbar/trips/:tripId/gear/:itemId
 * Assign gear to user (volunteer)
 */
router.put('/trips/:tripId/gear/:itemId', async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { tripId, itemId } = req.params;
        const trip_id = getParam(tripId);

        // Check if participant
        const participant = await db
            .select()
            .from(tripParticipants)
            .where(and(
                eq(tripParticipants.tripId, trip_id),
                eq(tripParticipants.userId, req.user.id)
            ))
            .limit(1);

        if (participant.length === 0) {
            return res.status(403).json({ error: 'Only participants can volunteer for gear' });
        }

        // Assign gear
        const updatedGear = await db
            .update(tripGearItems)
            .set({
                assignedTo: req.user.id,
                isCovered: true
            })
            .where(eq(tripGearItems.id, getParam(itemId)))
            .returning();

        res.json({ success: true, data: updatedGear[0] });
    } catch (error) {
        console.error('[CampBar] Error assigning gear:', error);
        res.status(500).json({ error: 'Failed to assign gear' });
    }
});

/**
 * DELETE /api/campbar/trips/:tripId/gear/:itemId
 * Remove gear item
 */
router.delete('/trips/:tripId/gear/:itemId', async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { itemId } = req.params;

        // Can only delete if you added it or you're organizer
        const gear = await db.select().from(tripGearItems).where(eq(tripGearItems.id, getParam(itemId))).limit(1);
        if (gear.length === 0) {
            return res.status(404).json({ error: 'Gear item not found' });
        }

        await db.delete(tripGearItems).where(eq(tripGearItems.id, getParam(itemId)));

        res.json({ success: true, message: 'Gear item removed' });
    } catch (error) {
        console.error('[CampBar] Error removing gear:', error);
        res.status(500).json({ error: 'Failed to remove gear' });
    }
});

// ============================================================================
// MESSAGES
// ============================================================================

/**
 * GET /api/campbar/trips/:id/messages
 * Get trip messages (participants only)
 */
router.get('/trips/:id/messages', async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { id } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        // Check if participant
        const participant = await db
            .select()
            .from(tripParticipants)
            .where(and(
                eq(tripParticipants.tripId, getParam(id)),
                eq(tripParticipants.userId, req.user.id)
            ))
            .limit(1);

        if (participant.length === 0) {
            return res.status(403).json({ error: 'Only participants can view messages' });
        }

        const messagesRaw = await db
            .select({
                id: tripMessages.id,
                message: tripMessages.message,
                createdAt: tripMessages.createdAt,
                userId: tripMessages.userId,
                userName: users.fullName,
                userPicture: users.picture
            })
            .from(tripMessages)
            .leftJoin(users, eq(tripMessages.userId, users.id))
            .where(eq(tripMessages.tripId, getParam(id)))
            .orderBy(desc(tripMessages.createdAt))
            .limit(Number(limit))
            .offset(Number(offset));

        const messages = messagesRaw.reverse().map(msg => ({
            id: msg.id,
            message: msg.message,
            createdAt: msg.createdAt,
            userId: msg.userId,
            user: {
                id: msg.userId,
                name: msg.userName,
                picture: msg.userPicture
            }
        }));

        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('[CampBar] Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

/**
 * POST /api/campbar/trips/:id/messages
 * Send message (participants only)
 */
router.post('/trips/:id/messages', validate(v.sendMessageSchema, 'body'), async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { id } = req.params;
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        // Check if participant
        const participant = await db
            .select()
            .from(tripParticipants)
            .where(and(
                eq(tripParticipants.tripId, getParam(id)),
                eq(tripParticipants.userId, req.user.id)
            ))
            .limit(1);

        if (participant.length === 0) {
            return res.status(403).json({ error: 'Only participants can send messages' });
        }

        const newMessage = await db
            .insert(tripMessages)
            .values({
                tripId: getParam(id),
                userId: req.user.id,
                message: message.trim()
            })
            .returning();

        res.status(201).json({ success: true, data: newMessage[0] });
    } catch (error) {
        console.error('[CampBar] Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

export default router;
