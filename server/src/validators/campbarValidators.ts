import { z } from 'zod';

// ============================================================================
// UUID and Common Types
// ============================================================================

export const uuidSchema = z.string().uuid('Invalid UUID format');

// ============================================================================
// Trip Board Schemas
// ============================================================================

export const createTripSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().optional(),
    destination: z.string().max(255).optional(),
    difficulty: z.enum(['easy', 'moderate', 'hard', 'expert']).default('moderate'),
    tripType: z.string().max(50).default('camping'),
    maxParticipants: z.number().int().min(1).max(100).default(10),
    meetingPoint: z.string().max(255).optional(),
    meetingTime: z.string().datetime().optional(),
});

export const updateTripSchema = createTripSchema.partial();

export const tripQuerySchema = z.object({
    status: z.enum(['planning', 'confirmed', 'ongoing', 'completed', 'cancelled']).optional(),
    difficulty: z.enum(['easy', 'moderate', 'hard', 'expert']).optional(),
    organizerId: uuidSchema.optional(),
    search: z.string().optional(),
});

// ============================================================================
// Date Voting Schemas
// ============================================================================

export const addDateOptionSchema = z.object({
    startDate: z.string().datetime('Start date must be a valid datetime'),
    endDate: z.string().datetime('End date must be a valid datetime'),
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
});

export const confirmDatesSchema = z.object({
    dateOptionId: uuidSchema,
});

// ============================================================================
// Gear Management Schemas
// ============================================================================

export const addGearItemSchema = z.object({
    itemName: z.string().min(1, 'Item name is required').max(255),
    quantity: z.number().int().min(1).default(1),
});

export const assignGearSchema = z.object({
    userId: uuidSchema,
});

// ============================================================================
// Messaging Schemas
// ============================================================================

export const sendMessageSchema = z.object({
    message: z.string().min(1, 'Message cannot be empty').max(1000),
});

export const messagesQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================================
// Param Schemas (for route parameters)
// ============================================================================

export const tripIdParamSchema = z.object({
    id: uuidSchema,
});

export const dateIdParamSchema = z.object({
    dateId: uuidSchema,
});

export const gearIdParamSchema = z.object({
    gearId: uuidSchema,
});

// ============================================================================
// Type Exports (for TypeScript inference)
// ============================================================================

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type TripQuery = z.infer<typeof tripQuerySchema>;
export type AddDateOptionInput = z.infer<typeof addDateOptionSchema>;
export type ConfirmDatesInput = z.infer<typeof confirmDatesSchema>;
export type AddGearItemInput = z.infer<typeof addGearItemSchema>;
export type AssignGearInput = z.infer<typeof assignGearSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type MessagesQuery = z.infer<typeof messagesQuerySchema>;
