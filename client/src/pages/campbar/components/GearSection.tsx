import React, { useState } from 'react';
import { Package, Plus, Trash2, Hand } from 'lucide-react';
import campbarApi from '../../../utils/campbarApi';
import type { GearItem } from '../../../utils/campbarTypes';

interface Props {
    tripId: string;
    gearItems: GearItem[];
    isOrganizer: boolean;
    currentUserId: string;
    onRefresh: () => void;
}

export const GearSection: React.FC<Props> = ({ tripId, gearItems, isOrganizer, currentUserId, onRefresh }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [itemName, setItemName] = useState('');
    const [category, setCategory] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAddGear = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!itemName.trim()) {
            alert('Please enter item name');
            return;
        }

        setLoading(true);
        try {
            await campbarApi.addGear(tripId, { itemName, category, quantity, notes });
            setItemName('');
            setCategory('');
            setQuantity(1);
            setNotes('');
            setShowAddForm(false);
            onRefresh();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to add gear');
        } finally {
            setLoading(false);
        }
    };

    const handleVolunteer = async (itemId: string) => {
        setLoading(true);
        try {
            await campbarApi.volunteerGear(tripId, itemId);
            onRefresh();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to volunteer');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGear = async (itemId: string) => {
        const confirmed = window.confirm('Delete this gear item?');
        if (!confirmed) return;

        setLoading(true);
        try {
            await campbarApi.deleteGear(tripId, itemId);
            onRefresh();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to delete gear');
        } finally {
            setLoading(false);
        }
    };

    // Group gear by category
    const groupedGear = gearItems.reduce((acc, item) => {
        const cat = item.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, GearItem[]>);

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Package className="text-purple-600" size={24} />
                    <h2 className="text-xl font-bold text-gray-900">Gear Coordination</h2>
                </div>
                {isOrganizer && !showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition"
                    >
                        <Plus size={16} />
                        Add Gear Item
                    </button>
                )}
            </div>

            {/* Add Gear Form */}
            {showAddForm && (
                <form onSubmit={handleAddGear} className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Add Gear Item</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-700 mb-1">Item Name *</label>
                            <input
                                type="text"
                                required
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                                placeholder="e.g., Tent (4-person)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-700 mb-1">Category</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">Select category</option>
                                    <option value="Shelter">Shelter</option>
                                    <option value="Cooking">Cooking</option>
                                    <option value="Safety">Safety</option>
                                    <option value="Personal">Personal</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-700 mb-1">Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-700 mb-1">Notes</label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Optional details"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setShowAddForm(false);
                                setItemName('');
                                setCategory('');
                                setQuantity(1);
                                setNotes('');
                            }}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition disabled:opacity-50"
                        >
                            Add Item
                        </button>
                    </div>
                </form>
            )}

            {/* Gear Items */}
            {gearItems.length === 0 ? (
                <p className="text-gray-500 text-sm">No gear items yet. Organizer can add items needed for the trip.</p>
            ) : (
                <div className="space-y-4">
                    {Object.entries(groupedGear).map(([cat, items]) => (
                        <div key={cat} className="space-y-2">
                            <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">{cat}</h3>
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                                >
                                    <div className="flex-1">
                                        <div className="font-semibold text-gray-900">
                                            {item.itemName} {item.quantity > 1 && `(x${item.quantity})`}
                                        </div>
                                        {item.notes && (
                                            <div className="text-xs text-gray-600 mt-1">{item.notes}</div>
                                        )}
                                        {item.assignedUser && (
                                            <div className="text-sm text-green-700 mt-1 flex items-center gap-1">
                                                <Hand size={14} />
                                                {item.assignedUser.name} is bringing this
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {!item.assignedTo ? (
                                            <button
                                                onClick={() => handleVolunteer(item.id)}
                                                disabled={loading}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
                                            >
                                                I'll bring this
                                            </button>
                                        ) : item.assignedTo === currentUserId ? (
                                            <button
                                                onClick={() => handleVolunteer(item.id)}
                                                disabled={loading}
                                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition disabled:opacity-50"
                                            >
                                                Release
                                            </button>
                                        ) : (
                                            <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold">
                                                Assigned
                                            </span>
                                        )}

                                        {isOrganizer && (
                                            <button
                                                onClick={() => handleDeleteGear(item.id)}
                                                disabled={loading}
                                                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                                                title="Delete item"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GearSection;
