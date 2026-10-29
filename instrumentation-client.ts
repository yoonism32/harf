import {z} from 'zod';

// Strict CSP blocks Zod's eval probe; use its interpreted validator from startup.
z.config({jitless: true});
