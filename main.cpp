#include <SDL.h>
#include <Windows.h>

#include <iostream>
#include <memory>
#include <random>
#include <array>
#include <fstream>

using std::cout;
using std::endl;
using std::unique_ptr;
using std::array;
using std::ifstream;

constexpr int SCREEN_WIDTH = 1024;
constexpr int SCREEN_HEIGHT = 768;
constexpr int BLOCK_SIZE = 4;
constexpr int MAP_COLUMNS = 256;
constexpr int MAP_ROWS = 192;
constexpr int DISTRICT_SIZE = 64;

static_assert(SCREEN_WIDTH == BLOCK_SIZE * MAP_COLUMNS);
static_assert(SCREEN_HEIGHT == BLOCK_SIZE * MAP_ROWS);

enum class SystemError : int {
	FAIL_INIT_SDL=1,
	FAIL_INIT_WINDOW,
};

struct Block {
	enum class GeoType : int {
		Plain,
		Block
	} geo = GeoType::Plain;
	int owner = 0;

	Block() = default;
	Block(Block&) = delete;
	Block(Block&&) = delete;
};

class Main {
	SDL_Window* window = nullptr;
	SDL_Surface* screen = nullptr;
	std::mt19937_64 rnd{};

	array<array<Block, MAP_ROWS>, MAP_COLUMNS> blocks{};
public:
	bool would_be_close = false;
	uint64_t total_tick = 0;
public:
	int init() {
		cout << "Hello world!" << endl;

		ifstream file{ "geo.bmp", std::ios::ios_base::binary };
		uint8_t buf[80000]{};
		file.read((char*)buf, 80000);

		if (SDL_Init(SDL_INIT_VIDEO) < 0) {
			printf("%s\n", SDL_GetError());
			return (int)SystemError::FAIL_INIT_SDL;
		}

		window = SDL_CreateWindow("SDL Tutorial",
			SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED,
			SCREEN_WIDTH, SCREEN_HEIGHT, SDL_WINDOW_SHOWN
		);
		if (window == nullptr) {
			printf("%s\n", SDL_GetError());
			return (int)SystemError::FAIL_INIT_WINDOW;
		}

		screen = SDL_GetWindowSurface(window);

		for (int x = 0; x < MAP_COLUMNS; ++x) {
			for (int y = 0; y < MAP_ROWS; ++y) {
				uint8_t B = buf[54 + (x + y * MAP_COLUMNS) * 3];
				uint8_t G = buf[54 + (x + y * MAP_COLUMNS) * 3 + 1];
				uint8_t R = buf[54 + (x + y * MAP_COLUMNS) * 3 + 1];
				
				

				blocks[x][y].owner = rnd() % 3;
				

				float nx = sinf(x / 24.f);
				float ny = sinf(y / 24.f);
				if (B > 127)
					blocks[x][y].geo = Block::GeoType::Block;
			}
		}


		return 0;
	}

	void loop() {
		static SDL_Event _event{};
		while (SDL_PollEvent(&_event) != 0) {
			if (_event.type == SDL_QUIT) {
				this->would_be_close = true;
			}
			else if (_event.type == SDL_KEYDOWN) {
				if (_event.key.keysym.sym == SDLK_ESCAPE)
					this->would_be_close = true;
			}
		}			


		for (int x = 0; x < MAP_COLUMNS; ++x) {
			for (int y = 0; y < MAP_ROWS; ++y) {
				for (int z = 0; z < 4; ++z) {
					static int vector[4][2] = { {0,1}, {-1,0},{0,-1},{1,0} };
					int dx = x + vector[z][0];
					int dy = y + vector[z][1];
					if (dx >= 0 && dx < MAP_COLUMNS && dy >= 0 && dy < MAP_ROWS) {
						if (rnd() % 100 < 5) {
							blocks[dx][dy].owner = blocks[x][y].owner;
						}
					}
				}
			}
		}

	}

	void draw() {
		SDL_FillRect(screen, nullptr, 0x000000);

		static SDL_Rect rect{};

		rect.w = BLOCK_SIZE;
		rect.h = BLOCK_SIZE;

		for (int x = 0; x < MAP_COLUMNS; ++x) {
			for (int y = 0; y < MAP_ROWS; ++y) {
				rect.x = x * BLOCK_SIZE;
				rect.y = y * BLOCK_SIZE;
				if (blocks[x][y].geo == Block::GeoType::Block) {
					SDL_FillRect(screen, &rect, 0x0e1038);
				}
				else {
					if (blocks[x][y].owner == 0) SDL_FillRect(screen, &rect, 0x204070);
					else if (blocks[x][y].owner == 1) SDL_FillRect(screen, &rect, 0x282070);
					else SDL_FillRect(screen, &rect, 0x206870);
				}
			}
		}
		SDL_UpdateWindowSurface(window);
		++total_tick;
	}

	void destory() {
		SDL_DestroyWindow(window);
		SDL_Quit();
	}
};

int main(int argc, char* args[]) {
	Main O{};
	int r = O.init();
	if (r != 0) return r;
	
	while (!O.would_be_close) {
		O.loop();
		O.draw();
	}
	

	O.destory();

	return 0;
}