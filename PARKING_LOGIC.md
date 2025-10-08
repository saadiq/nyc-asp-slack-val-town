# NYC ASP Parking Logic & Heuristics

This document explains the decision-making logic and heuristics used by the NYC ASP Bot to determine parking recommendations.

## Overview

The bot sends two daily messages:
- **5 AM**: Weekly calendar + current location + today's move plan
- **10 AM**: Urgent reminder if a move is needed for the next cleaning day

## Core Heuristic

### Where to Park
**Rule**: Park on the side **opposite** of the cleaning.

- If **near side** has cleaning → Park on **far side**
- If **far side** has cleaning → Park on **near side**

### When to Move
The bot looks ahead to find the **next active cleaning day** (skipping suspensions) and determines if you need to move.

**Move Required**: Current side ≠ Next cleaning's required side
**Stay Put**: Current side = Next cleaning's required side

## Message Timing & Intent

### 5 AM Message - Daily Planning
**Purpose**: Give you advance notice of today's parking situation and whether you'll need to move after cleaning.

**What it shows**:
1. **Weekly calendar** - Full week overview with suspension annotations
2. **Current location** - Where the car is right now (inferred from schedule)
3. **Today's action plan**:
   - If today has cleaning: "After today's cleaning (10:30), move to [SIDE] for [NEXT-DAY]"
   - If today is suspended: "Today is suspended. No move needed."
   - If no cleaning today: "Stay on [SIDE] - already positioned for [NEXT-DAY]"

**Intended use**: Morning planning - know what to expect for the day.

### 10 AM Message - Urgent Reminder
**Purpose**: Alert you at the end of the cleaning window if you need to move NOW for tomorrow's cleaning.

**What it shows**:
1. **Current location** - Where the car is right now
2. **Urgency check**:
   - **If move needed**: "⚠️ MOVE NOW to [SIDE] - Next cleaning [DAY] on [CURRENT-SIDE]"
   - **If already correct**: "✅ Stay put - already on correct side"

**Intended use**: Time-sensitive action - move before all the good spots are taken.

## Suspension Handling

**Critical Rule**: Suspended days have **NO parking requirement** (`side = null`).

When checking for the next cleaning day, the algorithm:
1. Skips all suspended days
2. Skips all days with no scheduled cleaning (e.g., Wednesday in Mon/Tue/Thu/Fri schedule)
3. Returns the first active cleaning day

**Example**: If Tuesday and Wednesday are suspended:
- Monday → looks ahead → skips Tue (suspended), skips Wed (suspended) → finds Thursday
- If Monday and Thursday both require "far side", message says: "Stay put, no move needed"

## Current Location Inference

Since the bot doesn't track state, it **infers** current location by looking backward:

1. Find today in the week view
2. Look backward through previous days
3. Return the `side` value from the most recent day that has one
4. If no previous day found, default to `far` (typical weekend position)

**Example Week** (Mon=far, Tue=suspended, Wed=suspended, Thu=far, Fri=near):
- Monday: Current = far (today)
- Tuesday: Current = far (inherited from Monday)
- Wednesday: Current = far (inherited from Monday through Tuesday)
- Thursday: Current = far (today)
- Friday: Current = near (today)

## Example Scenarios

### Normal Week (No Suspensions)
**Config**: Near side Mon/Thu, Far side Tue/Fri

| Day | Cleaning | Park On | Move After Cleaning? |
|-----|----------|---------|---------------------|
| Mon | Near     | Far     | Move to Near (for Tue) |
| Tue | Far      | Near    | Move to Far (for Thu) |
| Wed | None     | Far*    | Stay on Far (for Thu) |
| Thu | Near     | Far     | Move to Near (for Fri) |
| Fri | Far      | Near    | No more cleaning this week |

*Wed inherits position from Tuesday's move

### Week with Suspensions (Oct 6-12, 2025)
**Config**: Near side Mon/Thu, Far side Tue/Fri
**Suspensions**: Tue Oct 7, Wed Oct 8 (Sukkot)

| Day | Status | Park On | Next Cleaning | Move Needed? |
|-----|--------|---------|---------------|--------------|
| Mon | Active | Far     | Thu (far)     | ✅ No - stay put |
| Tue | 🚫 SUSPENDED | null | Thu (far) | ✅ No - stay put |
| Wed | 🚫 SUSPENDED | null | Thu (far) | ✅ No - stay put |
| Thu | Active | Far     | Fri (near)    | ⚠️ Yes - move to near |
| Fri | Active | Near    | None          | ✅ No - weekend |

**Key Insight**: Because Tuesday is suspended, Monday doesn't need to move. The next actual cleaning is Thursday, which also requires the far side.

## Weekend Behavior

The bot sends messages **every day** including Sat/Sun for full transparency during the testing phase.

Weekend messages will typically show:
- **Saturday 5 AM**: "Stay on [SIDE], next cleaning is Monday"
- **Saturday 10 AM**: "Stay put, next cleaning is Monday"
- **Sunday 5 AM**: Weekly calendar + "Stay on [SIDE], prepare for Monday if needed"
- **Sunday 10 AM**: "Move to [SIDE] if not already there for Monday" (if Monday requires different side)

## Code Implementation

The core logic is implemented in `val-town.ts`:

- **`buildWeekView()`** (lines 289-315): Builds week data, sets `side = null` for suspended days
- **`inferCurrentLocation()`** (lines 337-349): Infers where car is by looking backward
- **`findNextCleaningDay()`** (lines 355-367): Finds next active cleaning, skipping suspensions
- **`build5AMMessage()`** (lines 424-489): Morning summary logic
- **`build10AMMessage()`** (lines 494-536): Urgent move reminder logic

## Testing

To verify the logic for a specific week:
```bash
bun run scripts/verify-logic.ts
```

This tests the decision-making for the Oct 6-12, 2025 week with suspensions.

## Troubleshooting

### "Why did I get a move message when the next day is suspended?"
- Check that the ICS calendar is being fetched correctly
- Verify suspended days have `side = null` in the week view
- The bug from Oct 8, 2025 was caused by suspended days incorrectly having a `side` value

### "Why does it say move when I'm already on the right side?"
- Check the `inferCurrentLocation()` logic - it might be incorrectly inferring from a previous day
- Verify the week view has the correct `side` values for each day

### "Messages are confusing about which side to park on"
- Remember: The `side` field means "where TO park", not "where cleaning is"
- Near-side cleaning → park on far side
- Far-side cleaning → park on near side

## Future Enhancements

Potential improvements to consider:
- [ ] Look ahead to next week's Monday for Friday/weekend planning
- [ ] Add configurable emoji for different street sides
- [ ] Support for multiple cars with different parking requirements
- [ ] Historical tracking to learn from actual move patterns
- [ ] Integration with weather API for snow emergency predictions
