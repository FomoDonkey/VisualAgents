import { BuildingDef, BuildingType } from '../types';

export const BUILDINGS: BuildingDef[] = [
  {
    type: 'think-tank', name: 'Meeting Room', shortName: 'Meeting',
    x: 1, y: 1, width: 9, height: 6,
    entranceTile: { x: 10, y: 4 },
    color: 0x1e2a3e, roofColor: 0, icon: 'icon-brain',
  },
  {
    type: 'search-station', name: 'Research Corner', shortName: 'Research',
    x: 1, y: 9, width: 9, height: 6,
    entranceTile: { x: 10, y: 12 },
    color: 0x1e2e28, roofColor: 0, icon: 'icon-search',
  },
  {
    type: 'file-library', name: 'Archive Room', shortName: 'Archive',
    x: 1, y: 17, width: 9, height: 6,
    entranceTile: { x: 10, y: 20 },
    color: 0x2a2420, roofColor: 0, icon: 'icon-file',
  },
  {
    type: 'code-workshop', name: 'Dev Floor', shortName: 'Dev',
    x: 14, y: 1, width: 12, height: 11,
    entranceTile: { x: 20, y: 12 },
    color: 0x1a1e2a, roofColor: 0, icon: 'icon-wrench',
  },
  {
    type: 'terminal-tower', name: 'Server Room', shortName: 'Servers',
    x: 29, y: 1, width: 10, height: 8,
    entranceTile: { x: 29, y: 6 },
    color: 0x141420, roofColor: 0, icon: 'icon-terminal',
  },
  {
    type: 'deploy-dock', name: 'Deploy Station', shortName: 'Deploy',
    x: 29, y: 12, width: 10, height: 7,
    entranceTile: { x: 29, y: 16 },
    color: 0x1e1a26, roofColor: 0, icon: 'icon-git',
  },
];

export function getBuildingByType(type: BuildingType): BuildingDef {
  return BUILDINGS.find(b => b.type === type)!;
}
