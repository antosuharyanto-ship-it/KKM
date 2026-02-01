// CampBar TypeScript interfaces matching backend schema

export interface Trip {
    id: string;
    title: string;
    destination: string;
    description?: string;
    difficulty: 'easy' | 'moderate' | 'hard' | 'expert';
    status: 'planning' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled';
    startDate?: string;
    endDate?: string;
    maxParticipants: number;
    currentParticipants: number;
    estimatedCost?: string;
    datesConfirmed: boolean;
    organizerId: string;
    organizer?: User;
    createdAt: string;
    updatedAt: string;
    // Nested data loaded with trip details
    participants?: Participant[];
    dateOptions?: DateVote[];
    gearItems?: GearItem[];
    messages?: Message[];
}

export interface User {
    id: string;
    name: string;
    email: string;
    picture?: string;
}

export interface Participant {
    id: string;
    tripId: string;
    userId: string;
    status: 'interested' | 'confirmed' | 'waitlist';
    joinedAt: string;
    ticketUrl?: string;
    ticketCode?: string;
    user?: User;
}

export interface DateVote {
    id: string;
    tripId: string;
    startDate: string;
    endDate: string;
    voteCount: number;
    createdAt: string;
    // Client-side computed
    userVoted?: boolean;
}

export interface GearItem {
    id: string;
    tripId: string;
    itemName: string;
    category?: string;
    quantity: number;
    assignedTo?: string;
    assignedUser?: User;
    packed: boolean;
    notes?: string;
}

export interface Message {
    id: string;
    tripId: string;
    userId: string;
    message: string;
    createdAt: string;
    user?: User;
}

// Form types
export interface CreateTripFormData {
    title: string;
    destination: string;
    description?: string;
    difficulty: 'easy' | 'moderate' | 'hard' | 'expert';
    maxParticipants: number;
    startDate?: string;
    endDate?: string;
    estimatedCost?: string;
}

export interface TripFilters {
    status?: 'planning' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled';
    difficulty?: 'easy' | 'moderate' | 'hard' | 'expert';
    search?: string;
}

export interface DateOptionFormData {
    startDate: string;
    endDate: string;
}

export interface GearItemFormData {
    itemName: string;
    category?: string;
    quantity: number;
    notes?: string;
}
