// SPDX-FileCopyrightText: Copyright (c) 2026 Process Mission
// SPDX-License-Identifier: MIT
export const programYearAt = time => Number(new Intl.DateTimeFormat('en', {
  timeZone: 'Asia/Shanghai', year: 'numeric',
}).format(new Date(time)));

export function taskYear(issue, {at = new Date(), recordedYear, required = true} = {}) {
  const years = issue.labels.map(label => typeof label === 'string' ? label : label.name).filter(name => /^\d{4}$/.test(name));
  if (!years.length && !required) return null;
  if (years.length !== 1 || !/^20\d{2}$/.test(years[0])) {
    throw new Error('Select exactly one supported four-digit year label.');
  }
  const year = Number(years[0]);
  const minimum = Math.max(2026, programYearAt(at));
  if (year < 2026 || year < minimum && year !== recordedYear) throw new Error(`Select task year ${minimum} or later; past years are unavailable for new tasks.`);
  return year;
}
