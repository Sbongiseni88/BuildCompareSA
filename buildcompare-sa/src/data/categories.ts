import {
    Hammer,
    BrickWall,
    HardHat,
    Home,
    Zap,
    Droplets,
    PaintBucket,
    Maximize,
    DoorOpen,
    ArrowUpFromLine
} from 'lucide-react';

export interface Category {
    id: string;
    label: string;
    icon: any;
    description: string;
    subcategories: string[];
}

export const constructionCategories: Category[] = [
    {
        id: 'site-establishment',
        label: 'Site Establishment',
        icon: HardHat,
        description: 'Safety gear, fencing, and site preparation',
        subcategories: ['Safety Boots', 'Hard Hats', 'Shade Cloth', 'Wheelbarrows']
    },
    {
        id: 'foundation',
        label: 'Foundation',
        icon: ArrowUpFromLine,
        description: 'Concrete, rebar, and waterproofing',
        subcategories: ['Cement (42.5N)', 'Building Sand', 'Stone', 'Rebar Y12', 'DPC Sheeting']
    },
    {
        id: 'brickwork',
        label: 'Brickwork',
        icon: BrickWall,
        description: 'Bricks, mortar, and lintels',
        subcategories: ['Stock Bricks', 'Face Bricks', 'Brickforce', 'Lintels', 'Cement (32.5N)']
    },
    {
        id: 'roofing',
        label: 'Roofing',
        icon: Home,
        description: 'Trusses, sheeting, and tiles',
        subcategories: ['Roof Tiles', 'IBR Sheeting', 'Timber Beams', 'Insulation']
    },
    {
        id: 'doors-windows',
        label: 'Doors & Windows',
        icon: DoorOpen,
        description: 'Frames, glass, and fittings',
        subcategories: ['Aluminium Windows', 'Door Frames', 'Internal Doors', 'Locks & Handles']
    },
    {
        id: 'plumbing',
        label: 'Plumbing',
        icon: Droplets,
        description: 'Pipes, geysers, and sanitaryware',
        subcategories: ['PVC Pipes', 'Copper Pipes', 'Geysers', 'Taps & Mixers']
    },
    {
        id: 'electrical',
        label: 'Electrical',
        icon: Zap,
        description: 'Wiring, conduit, and lighting',
        subcategories: ['Conduit', 'Twin & Earth Cable', 'Light Switches', 'DB Boards']
    },
    {
        id: 'finishes',
        label: 'Finishes',
        icon: PaintBucket,
        description: 'Paint, tiles, and cornices',
        subcategories: ['Interior Paint', 'Exterior Paint', 'Floor Tiles', 'Cornices']
    }
];
