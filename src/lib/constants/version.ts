/**
 * MitracaMSA Application Version Configuration
 *
 * Skema Versioning Tahap Development:
 * - Baseline Awal: 0.0.1
 * - Update Fitur / Perbaikan: 0.0.1.<running_number> (Contoh: 0.0.1.1, 0.0.1.2, dst.)
 * - Live Production: 1.0.0
 */

import packageJson from '../../../package.json';

export const APP_VERSION = packageJson.version;
export const APP_STAGE = 'Development';
