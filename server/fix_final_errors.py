#!/usr/bin/env python3
"""
Final fix for remaining TypeScript errors in campbarRoutes.ts:
- Lines with dateOptionId need get Param(dateOptionId)
- Lines with dateId need getParam(dateId)
- Line 345 needs null checks
"""

import re

def final_fixes():
    file_path = "/Users/suharyanto/.gemini/antigravity/scratch/KKM/server/src/routes/campbarRoutes.ts"
    
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    # Fix line 354: eq(tripParticipants.tripId, id) where id comes from destructured param
   # Need to find context and fix
    # This is in POST /trips/:id/join - already handled by earlier replacements
    
    # Fix lines 510, 551: dateOption Id and dated
    # Line 510: eq(tripDateUserVotes.dateOptionId, dateOptionId)
    # Line 529, 564: eq(tripDateVotes.id, dateOptionId) and similar
    
    content = ''.join(lines)
    
    # Fix remaining dateOptionId without getParam()
    content = re.sub(
        r'eq\(tripDateUserVotes\.dateOptionId, dateOptionId\)(?!\))',
        r'eq(tripDateUserVotes.dateOptionId, getParam(dateOptionId))',
        content
    )
    
    # Fix dateId parameters that aren't wrapped yet
    content = re.sub(
        r'eq\(tripDateVotes\.id, dateOptionId\)(?!\))',
        r'eq(tripDateVotes.id, getParam(dateOptionId))',
        content
    )
    
    # Fix null check on line 345
    content = re.sub(
        r'if \(trip\[0\]\.currentParticipants >= trip\[0\]\.maxParticipants\)',
        r'if (trip[0].currentParticipants! >= trip[0].maxParticipants!)',
        content
    )
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print("✅ Applied final TypeScript fixes")

if __name__ == "__main__":
    final_fixes()
