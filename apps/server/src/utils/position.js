const STEP = 1000;

// For appending to the end of a sequence
function tailPosition(lastPos) {
  if (typeof lastPos !== 'number' || Number.isNaN(lastPos)) return STEP;
  return lastPos + STEP;
}

// Compute a position between two neighbors
function between(prevPos, nextPos) {
  if (prevPos == null && nextPos == null) return STEP;
  if (prevPos == null) return nextPos - STEP;
  if (nextPos == null) return prevPos + STEP;
  const mid = (prevPos + nextPos) / 2;
  if (!Number.isFinite(mid) || Math.abs(nextPos - prevPos) < 1e-6) {
    return prevPos + STEP;
  }
  return mid;
}

module.exports = { STEP, tailPosition, between };