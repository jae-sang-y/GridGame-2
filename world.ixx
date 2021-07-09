export module World;

import std.core;
import std.memory;

using std::array;
using std::vector;
using std::ifstream;

constexpr int32_t c_ceil(float num)
{
	return (static_cast<float>(static_cast<int32_t>(num)) == num)
		? static_cast<int32_t>(num)
		: static_cast<int32_t>(num) + ((num > 0) ? 1 : 0);
}
struct SDL_Rect
{
	int x, y;
	int w, h;
};

export namespace World {

	constexpr int SCREEN_WIDTH = 1024;
	constexpr int SCREEN_HEIGHT = 768;
	constexpr int BLOCK_SIZE = 4;
	constexpr int BLOCK_COLS = SCREEN_WIDTH / BLOCK_SIZE;
	constexpr int BLOCK_ROWS = SCREEN_HEIGHT / BLOCK_SIZE;
	constexpr int DISTRICT_FACTOR = 5;
	constexpr int DISTRICT_SIZE = 1 << DISTRICT_FACTOR;
	constexpr int DISTRICT_COLS = c_ceil(1.f * BLOCK_COLS / DISTRICT_SIZE);
	constexpr int DISTRICT_ROWS = c_ceil(1.f * BLOCK_ROWS / DISTRICT_SIZE);

	static_assert(SCREEN_WIDTH == BLOCK_SIZE * BLOCK_COLS);
	static_assert(SCREEN_HEIGHT == BLOCK_SIZE * BLOCK_ROWS);
	


	struct Block {
		enum class GeoType : int {
			Plain,
			Block
		} geo = GeoType::Plain;
		int owner = 0;
		int district_id = 0;

		int x = 0;
		int y = 0;
		//int id = 0;

		Block() = default;
		Block(Block&) = delete;
		Block(Block&&) = delete;
	};

	struct District {
		int x = 0;
		int y = 0;
		//int id = 0;

		uint64_t center_x = 0;
		uint64_t center_y = 0;
		uint64_t block_count = 0;
		std::set<int> connections{};
		std::map<int, int> distances{};
		//std::map<int, std::map<Block*, Block*>> exits{};

		void center_position_for_render(void* _rect) const {
			SDL_Rect* rect = reinterpret_cast<SDL_Rect*>(_rect);
			rect->x = center_x * BLOCK_SIZE + BLOCK_SIZE / 2;
			rect->y = center_y * BLOCK_SIZE + BLOCK_SIZE / 2;
		}
	};

	export typedef std::array<std::array<Block, BLOCK_ROWS>, BLOCK_COLS> Map;

	export struct World {
		Map map{};
		std::map<int, District> districts{};
		
	};

	constexpr int forwards[4][2] = { {1,0},{0,-1}, {-1,0}, {0,1} };
	export void build_world(World& world) {
		Map& map = world.map;
		std::mt19937_64 rnd{};
		ifstream file{ "geo.bmp", std::ios::ios_base::binary };
		file.seekg(0, std::ios::end);
		vector<uint8_t> buf{};
		buf.resize(file.tellg());
		file.seekg(0, std::ios::beg);
		file.read((char*)buf.data(), buf.size());

		for (int x = 0; x < BLOCK_COLS; ++x) {
			for (int y = 0; y < BLOCK_ROWS; ++y) {
				uint8_t B = buf[54 + (x + (BLOCK_ROWS - 1L - y) * BLOCK_COLS) * 3];
				uint8_t G = buf[54 + (x + (BLOCK_ROWS - 1L - y) * BLOCK_COLS) * 3 + 1];
				uint8_t R = buf[54 + (x + (BLOCK_ROWS - 1L - y) * BLOCK_COLS) * 3 + 2];

				map[x][y].x = x;
				map[x][y].y = y;
				//map[x][y].id = y + BLOCK_ROWS * x;
				if (B < 127) map[x][y].geo = Block::GeoType::Block;
			}
		}


		uint32_t district_builder[BLOCK_COLS][BLOCK_ROWS]{};
		
		uint32_t dk = 1;
		for (int x = 0; x < BLOCK_COLS; ++x) {
			for (int y = 0; y < BLOCK_ROWS; ++y) {
				if (map[x][y].geo == Block::GeoType::Block) {
					district_builder[x][y] = 0;
					continue;
				}
				district_builder[x][y] = dk++;
			}
		}

		bool changed = true;
		while (changed) {
			changed = false;

			for (int _x = 1; _x < 2 * BLOCK_COLS; ++_x) {
				int x = _x > BLOCK_COLS
					? (-BLOCK_COLS + _x)
					: (+BLOCK_COLS - _x);
				for (int _y = 1; _y < 2 * BLOCK_ROWS; ++_y) {
					int y = _y > BLOCK_ROWS
						? (-BLOCK_ROWS + _y)
						: (+BLOCK_ROWS - _y);
					if (map[x][y].geo == Block::GeoType::Block) continue;
					for (int z = 0; z < 4; ++z) {
						int ox = x + forwards[z][0];
						int oy = y + forwards[z][1];
						if (ox < 0 || oy < 0 || ox >= BLOCK_COLS || oy >= BLOCK_ROWS) continue;
						if (map[ox][oy].geo == Block::GeoType::Block) continue;
						if (x >> DISTRICT_FACTOR != ox >> DISTRICT_FACTOR ||
							y >> DISTRICT_FACTOR != oy >> DISTRICT_FACTOR) continue;
						if (district_builder[x][y] > district_builder[ox][oy]) {
							district_builder[ox][oy] = district_builder[x][y];
							changed = true;
						}
					}
				}
			}
		}
		for (int x = 0; x <  BLOCK_COLS; ++x) {
			for (int y = 0; y < BLOCK_ROWS; ++y) {
				if (map[x][y].geo == Block::GeoType::Block) continue;
				int did = district_builder[x][y];
				District& district = world.districts[did];
				district.center_x += x;
				district.center_y += y;
				++district.block_count;

				for (int z = 0; z < 4; ++z) {
					int ox = x + forwards[z][0];
					int oy = y + forwards[z][1];
					if (ox < 0 || oy < 0 || ox >= BLOCK_COLS || oy >= BLOCK_ROWS) continue;
					if (map[ox][oy].geo == Block::GeoType::Block) continue;
					if (x >> DISTRICT_FACTOR == ox >> DISTRICT_FACTOR &&
						y >> DISTRICT_FACTOR == oy >> DISTRICT_FACTOR) continue;
					
					int o_did = district_builder[ox][oy];
					District& district_o = world.districts[o_did];
					district.connections.insert(o_did);
					district_o.connections.insert(did);
				}
			}
		}

		for (auto& [did, district] : world.districts) {
			district.center_x /= district.block_count;
			district.center_y /= district.block_count;
			district.x = district.center_x >> DISTRICT_FACTOR;
			district.y = district.center_y >> DISTRICT_FACTOR;
			//district.id = did;

			for (const int& o_did : district.connections) {
				const District& o_district = world.districts.at(o_did);
				district.distances[o_did] = floorf(powf(
					powf(1.f * district.center_x - o_district.center_x, 2
					) +
					powf(1.f * district.center_y - o_district.center_y, 2),
					0.5
				));
				if (district.distances[o_did] < 0) throw std::exception();
			}
		}


		for (int dx = 0; dx < DISTRICT_COLS; ++dx) {
			for (int dy = 0; dy < DISTRICT_ROWS; ++dy) {
				for (int ax = 0; ax < DISTRICT_SIZE && dx * DISTRICT_SIZE + ax < BLOCK_COLS; ++ax) {
					int x = dx * DISTRICT_SIZE + ax;
					for (int ay = 0; ay < DISTRICT_SIZE && dy * DISTRICT_SIZE + ay < BLOCK_ROWS; ++ay) {						
						int y = dy * DISTRICT_SIZE + ay;
						map[x][y].owner = district_builder[x][y];
						map[x][y].district_id = district_builder[x][y];
					}
				}
			}
		}

		//for (int dx = 0; )
	}

	struct PathFindingEntry {
		uint64_t distance = -1;
		int from = 0;
		bool checked = false;
	};
	export std::list<int> path_finding(World& world, int _sx, int _sy, int _ex, int _ey) {
		bool changed = false;
		int sx = _ex;
		int sy = _ey;
		int ex = _sx;
		int ey = _sy;
		int sdid = world.map[sx][sy].district_id;
		int edid = world.map[ex][ey].district_id;
		std::map<int, PathFindingEntry> entries{};
		std::map<int, PathFindingEntry> postpone_entries{};
		
		entries[sdid] = {0, 0, false };


		do {
			int min_did = 0;
			int min_distance = 0;
			for (auto& [did, entry] : entries) {
				if (entry.checked) continue;
				if (min_did == 0) {
					min_did = did;
					min_distance = entry.distance;
				}
			}
			
			if (min_did == 0) return {};

			{
				int did = min_did;
				PathFindingEntry& entry = entries[did];
				const auto& district = world.districts[did];
				for (const auto& [odid, distance] : district.distances) {
					uint64_t extended_distance = entry.distance + distance;
					if (postpone_entries.count(odid) != 0) {
						PathFindingEntry& pentry = postpone_entries[odid];
						if (pentry.distance > extended_distance) {
							pentry.distance = extended_distance;
							pentry.from = did;
						}
					} 
					else if (entries.count(odid) != 0) {
						const PathFindingEntry& pentry = entries[odid];
						if (pentry.distance > extended_distance) {
							postpone_entries[odid] = { extended_distance, did, false };
						}
					}					
					else {
						postpone_entries[odid] = { extended_distance, did, false };
					}
				}
				entry.checked = true;
			}
			for (const auto& [did, entry] : postpone_entries) {
				entries[did] = entry;
			}
			postpone_entries.clear();
		} while (entries.count(edid) == 0);
		
		std::list<int> path = {};
		int did = edid;
		do {			
			int new_did = entries[did].from;
			path.push_back(new_did);
			did = new_did;
		} while(did != sdid);

		return path;
	}
}
