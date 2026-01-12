import { execSync } from 'child_process';

export function getLastCommitDate(): Date {
  try {
    const timestamp = execSync('git log -1 --format=%ct', { encoding: 'utf-8' }).trim();
    return new Date(parseInt(timestamp) * 1000);
  } catch {
    return new Date();
  }
}

export function formatCommitDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
