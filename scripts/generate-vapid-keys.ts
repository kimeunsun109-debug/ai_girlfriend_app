#!/usr/bin/env npx tsx
import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();

console.log('Add these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:support@pickmetalk.com');
