import type { MissionWorldId } from '../../types/game.ts';
import type { MissionWorldInstance } from './worldCommon.ts';

/**
 * Dynamically lazy-loads ONLY the active Mission World module on demand
 * so all 5 3D mission worlds are never loaded into memory simultaneously.
 */
export async function loadMissionWorld(
  worldId: MissionWorldId,
  simplified3d = false
): Promise<MissionWorldInstance> {
  switch (worldId) {
    case 1: {
      const mod = await import('./world1NexusCity.ts');
      return mod.buildWorld1NexusCity(simplified3d);
    }
    case 2: {
      const mod = await import('./world2NeuralLab.ts');
      return mod.buildWorld2NeuralLab(simplified3d);
    }
    case 3: {
      const mod = await import('./world3OrbitalStation.ts');
      return mod.buildWorld3OrbitalStation(simplified3d);
    }
    case 4: {
      const mod = await import('./world4MediaCity.ts');
      return mod.buildWorld4MediaCity(simplified3d);
    }
    case 5: {
      const mod = await import('./world5SkylineTower.ts');
      return mod.buildWorld5SkylineTower(simplified3d);
    }
  }
}
