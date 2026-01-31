#!/usr/bin/env python3
"""
Fix TypeScript errors in campbarRoutes.ts:
1. Wrap req.params with getParam() 
2. Fix camelCase -> snake_case for insert operations
"""

import re

def fix_campbar_routes():
    file_path = "/Users/suharyanto/.gemini/antigravity/scratch/KKM/server/src/routes/campbarRoutes.ts"
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Fix 1: Wrap `eq(..., id)` with getParam(id)
    # Pattern: eq(some.id, id) -> eq(some.id, getParam(id))
    content = re.sub(
        r'eq\(tripBoards\.id, id\)',
        r'eq(tripBoards.id, getParam(id))',
        content
    )
    
    # Fix 2: Same for tripParticipants.tripId
    content = re.sub(
        r'eq\(tripParticipants\.tripId, id\)',
        r'eq(tripParticipants.tripId, getParam(id))',
        content
    )
    
    # Fix 3: tripDateUserVotes.dateOptionId
    content = re.sub(
        r'eq\(tripDateUserVotes\.dateOptionId, dateOptionId\)',
        r'eq(tripDateUserVotes.dateOptionId, getParam(dateOptionId))',
        content
    )
    
    # Fix 4: tripDateVotes.id with dateOptionId
    content = re.sub(
        r'eq\(tripDateVotes\.id, dateOptionId\)',
        r'eq(tripDateVotes.id, getParam(dateOptionId))',
        content
    )
    
    # Fix 5: tripGearItems.id with itemId
    content = re.sub(
        r'eq\(tripGearItems\.id, itemId\)',
        r'eq(tripGearItems.id, getParam(itemId))',
        content
    )
    
    # Fix 6: tripGearItems.tripId
    content = re.sub(
        r'eq\(tripGearItems\.tripId, id\)',
        r'eq(tripGearItems.tripId, getParam(id))',
        content
    )
    
    # Fix 7: tripMessages.tripId
    content = re.sub(
        r'eq\(tripMessages\.tripId, id\)',
        r'eq(tripMessages.tripId, getParam(id))',
        content
    )
    
    # Fix 8: Insert operations - camelCase to snake_case
    # tripId -> trip_id, userId -> user_id, dateOptionId -> date_option_id
    
    # For tripParticipants insert
    content = re.sub(
        r'\.insert\(tripParticipants\)\.values\(\{\s*tripId: id,\s*userId: req\.user\.id,',
        r'.insert(tripParticipants).values({\n            trip_id: getParam(id),\n            user_id: req.user.id,',
        content
    )
    
    # For tripDateUserVotes insert
    content = re.sub(
        r'\.insert\(tripDateUserVotes\)\.values\(\{\s*userId: req\.user\.id,\s*dateOptionId: dateOptionId',
        r'.insert(tripDateUserVotes).values({\n            user_id: req.user.id,\n            date_option_id: getParam(dateOptionId)',
        content
    )
    
    # For tripMessages insert  
    content = re.sub(
        r'\.insert\(tripMessages\)\.values\(\{\s*tripId: id,\s*userId: req\.user\.id,',
        r'.insert(tripMessages).values({\n            trip_id: getParam(id),\n            user_id: req.user.id,',
        content
    )
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"✅ Fixed TypeScript errors in {file_path}")
    print("Applied fixes:")
    print("  - Wrapped all UUID params with getParam()")
    print("  - Fixed camelCase -> snake_case in inserts")

if __name__ == "__main__":
    fix_campbar_routes()
