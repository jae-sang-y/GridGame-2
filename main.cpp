#include <SDL.h>
#include <Windows.h>

import World;
import std.core;

using std::cout;
using std::endl;
using std::unique_ptr;
using std::array;
using std::vector;
using std::ifstream;




enum class SystemError : int {
	FAIL_INIT_SDL=1,
	FAIL_INIT_WINDOW,
	FAIL_INIT_RENDERER,
};



class Main {
	SDL_Window* window = nullptr;
	SDL_Renderer* renderer = nullptr;

	World::World world{};
public:
	bool would_be_close = false;
	uint64_t total_tick = 0;
public:
	int init() {


		if (SDL_Init(SDL_INIT_VIDEO) != 0) {
			printf("%s\n", SDL_GetError());
			return (int)SystemError::FAIL_INIT_SDL;
		}  
		SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1);

		window = SDL_CreateWindow("SDL Tutorial",
			SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED,
			World::SCREEN_WIDTH, World::SCREEN_HEIGHT, SDL_WINDOW_SHOWN
		);
		if (window == nullptr) {
			printf("%s\n", SDL_GetError());
			return (int)SystemError::FAIL_INIT_WINDOW;
		}

		printf("%s\n", SDL_GetError());
		renderer = SDL_CreateRenderer(window, -1, NULL);
		if (renderer == nullptr) {
			printf("%s\n", SDL_GetError());
			return (int)SystemError::FAIL_INIT_RENDERER;
		}


		build_world(this->world);
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

	}

	void draw() {
		SDL_RenderClear(renderer);

		static SDL_Rect rect{};
		static uint32_t colors[20] = {
			0x0d0221,0x0f084b,0x26408b,0xa6cfd5,0xc2e7d9,
			0x28783d,0x64ba6d,0xa5f2b3,0x786528,0xba9961,
			0xf2daa5,0x782832,0xba6179,0xf2a5b6,0x702878,
			0xa561ba,0x34a5f2,0x787828,0xbaae61,0xf2eca5
		};

		rect.w = World::BLOCK_SIZE;
		rect.h = World::BLOCK_SIZE;

		int path_finding_sx = 55;
		int path_finding_sy = 85;
		int path_finding_ex = 180;
		int path_finding_ey = 150;

		const auto path = World::path_finding(world, path_finding_sx, path_finding_sy, path_finding_ex, path_finding_ey);


		for (int x = 0; x < World::BLOCK_COLS; ++x) {
			for (int y = 0; y < World::BLOCK_ROWS; ++y) {
				rect.x = x * World::BLOCK_SIZE;
				rect.y = y * World::BLOCK_SIZE;
				if (world.map[x][y].geo == World::Block::GeoType::Block) {
					SDL_SetRenderDrawColor(renderer, 0x7e, 0x70, 0x98, 255);
					SDL_RenderFillRect(renderer, &rect);
				}
				else {
					int bgr = colors[world.map[x][y].owner % 20];
					int b = 0xff & (bgr >> 16);
					int g = 0xff & (bgr >> 8);
					int r = 0xff & (bgr);
					SDL_SetRenderDrawColor(renderer, r, g, b, 255);
					SDL_RenderFillRect(renderer, &rect);
				}
			}
		}

		SDL_SetRenderDrawColor(renderer, 255, 0, 0, 255);
		rect.x = World::BLOCK_SIZE * path_finding_sx;
		rect.y = World::BLOCK_SIZE * path_finding_sy;
		SDL_RenderFillRect(renderer, &rect);
		SDL_SetRenderDrawColor(renderer, 0, 0, 255, 255);
		rect.x = World::BLOCK_SIZE * path_finding_ex;
		rect.y = World::BLOCK_SIZE * path_finding_ey;
		SDL_RenderFillRect(renderer, &rect);

		SDL_SetRenderDrawColor(renderer, 0, 0, 0, 255);
		for (auto& [did, district] : world.districts) {
			district.center_position_for_render(&rect);
			int sx = rect.x;
			int sy = rect.y;

			rect.x -= 4;
			rect.y -= 4;
			rect.w = 8;
			rect.h = 8;
			SDL_RenderDrawRect(renderer, &rect);

			for (const int& o_did : district.connections) {
				const World::District& o_district = world.districts.at(o_did);
				o_district.center_position_for_render(&rect);
				int ex = rect.x;
				int ey = rect.y;
				SDL_RenderDrawLine(renderer, sx, sy, ex, ey);
			}
		}

		{
			int sx, sy, ex, ey;
			SDL_SetRenderDrawColor(renderer, 255, 0, 0, 255);
			world.districts[world.map[path_finding_sx][path_finding_sy].district_id].center_position_for_render(&rect);
			sx = rect.x;
			sy = rect.y;

			for (int did : path) {
				const auto& district = world.districts[did];
				district.center_position_for_render(&rect);
				ex = rect.x;
				ey = rect.y;
				SDL_RenderDrawLine(renderer, sx, sy, ex, ey);
				sx = ex;
				sy = ey;

			}
		}

		SDL_RenderPresent(renderer);
		++total_tick;

		
		
	}

	void destory() {
		SDL_DestroyRenderer(renderer);
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