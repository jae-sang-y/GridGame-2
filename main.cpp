#include <SDL.h>
#include <Windows.h>

#include <iostream>
#include <memory>
#include <random>

using std::cout;
using std::endl;
using std::unique_ptr;

constexpr int SCREEN_WIDTH = 1024;
constexpr int SCREEN_HEIGHT = 768;
constexpr int BLOCK_SIZE = 4;
constexpr int MAP_COLUMNS = SCREEN_WIDTH / BLOCK_SIZE;
constexpr int MAP_ROWS = SCREEN_HEIGHT / BLOCK_SIZE;

enum SystemError : int {
	FAIL_INIT_SDL=1,
	FAIL_INIT_WINDOW,
};

class Main {
	SDL_Window* window = nullptr;
	SDL_Surface* screen = nullptr;
	std::mt19937_64 rnd{};

	int block_state[MAP_COLUMNS][MAP_ROWS]{};
public:
	bool would_be_close = false;
	uint64_t total_tick = 0;
public:
	int init() {
		cout << "Hello world!" << endl;

		if (SDL_Init(SDL_INIT_VIDEO) < 0) {
			printf("%s\n", SDL_GetError());
			return SystemError::FAIL_INIT_SDL;
		}

		window = SDL_CreateWindow("SDL Tutorial",
			SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED,
			SCREEN_WIDTH, SCREEN_HEIGHT, SDL_WINDOW_SHOWN
		);
		if (window == nullptr) {
			printf("%s\n", SDL_GetError());
			return SystemError::FAIL_INIT_WINDOW;
		}

		screen = SDL_GetWindowSurface(window);

		for (int x = 0; x < MAP_COLUMNS; ++x) {
			for (int y = 0; y < MAP_ROWS; ++y) {
				block_state[x][y] = rnd() % 3;
			}
		}
		return 0;
	}

	void loop() {
		SDL_FillRect(screen, nullptr, 0x000000);

		static SDL_Rect rect{};
		static SDL_Event _event{};
		
		rect.w = BLOCK_SIZE;
		rect.h = BLOCK_SIZE;
		
		for (int x = 0; x < MAP_COLUMNS; ++x) {
			for (int y = 0; y < MAP_ROWS; ++y) {
				rect.x = x * BLOCK_SIZE;
				rect.y = y * BLOCK_SIZE;
				if (block_state[x][y] == 0) SDL_FillRect(screen, &rect, 0x204070);
				else if (block_state[x][y] == 1) SDL_FillRect(screen, &rect, 0x282070);
				else SDL_FillRect(screen, &rect, 0x206870);
			}
		}

		for (int x = 0; x < MAP_COLUMNS; ++x) {
			for (int y = 0; y < MAP_ROWS; ++y) {
				for (int z = 0; z < 4; ++z) {
					static int vector[4][2] = { {0,1}, {-1,0},{0,-1},{1,0} };
					int dx = x + vector[z][0];
					int dy = y + vector[z][1];
					if (dx >= 0 && dx < MAP_COLUMNS && dy >= 0 && dy < MAP_ROWS) {
						if (rnd() % 100 < 5
							//&& (block_state[dx][dy] - block_state[x][y] + 3) % 3 == 1
							) {
							block_state[dx][dy] = block_state[x][y];
						}
					}
				}
			}
		}

		SDL_PollEvent(&_event);

		SDL_UpdateWindowSurface(window);
		
		if (GetAsyncKeyState(VK_ESCAPE))
			this->would_be_close = true;
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
	}
	

	O.destory();

	return 0;
}