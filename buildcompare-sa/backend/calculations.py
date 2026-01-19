import math

def calculate_bricks_needed(wall_area_sqm: float, brick_type: str = "standard") -> dict:
    """
    Calculate number of bricks needed for a given wall area.
    Standard SA Imperial Brick: 222mm x 106mm x 73mm.
    Standard single wall (half brick wall) takes approx 52-55 bricks per m2 including waste.
    Double wall (one brick wall) takes approx 104-110 bricks per m2.
    """
    # Base rates per m2 (including some wastage)
    rates = {
        "standard_single": 55, # Single skin
        "standard_double": 110, # Double skin
        "maxi": 35, # Maxi bricks are larger
    }
    
    rate = rates.get(brick_type.lower(), 55)
    total_bricks = math.ceil(wall_area_sqm * rate)
    
    # Estimate sand and cement for mortar
    # Rule of thumb: 1000 bricks needs approx 3 bags cement and 0.6 m3 sand
    bags_cement = math.ceil((total_bricks / 1000) * 3)
    sand_m3 = round((total_bricks / 1000) * 0.6, 2)
    
    return {
        "bricks_count": total_bricks,
        "cement_bags_50kg": bags_cement,
        "building_sand_m3": sand_m3,
        "brick_type_used": brick_type
    }

def calculate_paint_liters(wall_area_sqm: float, coats: int = 2) -> dict:
    """
    Calculate paint required.
    Average spread rate: 8-10 m2 per liter per coat.
    """
    spread_rate = 9 # m2/liter
    total_liters = (wall_area_sqm * coats) / spread_rate
    
    return {
        "liters_needed": round(total_liters, 1),
        "buckets_20l": math.ceil(total_liters / 20),
        "buckets_5l": math.ceil(total_liters / 5) if total_liters < 20 else 0
    }

def calculate_roof_tiles(roof_area_sqm: float) -> dict:
    """
    Calculate roof tiles.
    Average: 11-12 tiles per m2.
    """
    rate = 11.5
    total_tiles = math.ceil(roof_area_sqm * rate)
    
    return {
        "tiles_count": total_tiles,
        "underlay_rolls": math.ceil(roof_area_sqm / 30) # Assuming 30m2 per roll
    }
