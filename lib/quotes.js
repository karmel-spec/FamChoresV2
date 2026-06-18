// A rotating daily note of encouragement — teamwork, discipline, contribution,
// hard work, cleanliness, and growth. Picked deterministically by day so it stays
// stable for the whole day and changes tomorrow.
const QUOTES = [
  'Teamwork makes the dream work — every chore you do helps the whole family.',
  'Discipline is choosing what you want most over what you want right now.',
  'A clean space makes a calm mind. You’ve got this!',
  'Small jobs done well add up to a home that runs smoothly.',
  'Hard work beats talent when talent doesn’t work hard.',
  'When everyone pitches in, everyone wins.',
  'Doing your part is how you show your family you care.',
  'Great things are built from lots of little efforts repeated daily.',
  'Be the kind of person who finishes what they start.',
  'A job worth doing is worth doing right the first time.',
  'Tidy room, tidy day. Future-you will say thanks.',
  'Responsibility isn’t a chore — it’s a superpower.',
  'You don’t have to be perfect, just a little better than yesterday.',
  'Helping out today builds habits that last a lifetime.',
  'Effort is a gift you give the people you love.',
  'Strong families are built by hands that help.',
  'Finish strong — the last task is just as important as the first.',
  'Pride in your work starts with showing up and trying.',
  'Every contribution counts, no matter how small.',
  'Consistency turns hard things into easy habits.',
  'Clean up as you go and the big mess never happens.',
  'Being dependable is one of the best things you can be.',
  'Today’s effort is tomorrow’s reward.',
  'Take care of your space and it will take care of you.',
  'A little discipline now means a lot more freedom later.',
  'Kindness is doing a job no one asked you to do.',
  'Work hard, be kind, and the rest takes care of itself.',
  'You are capable of more than you think — go show it.',
];

function epochDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function quoteForDay(dateStr, seed = 0) {
  const idx = (((epochDay(dateStr) + seed) % QUOTES.length) + QUOTES.length) % QUOTES.length;
  return QUOTES[idx];
}
