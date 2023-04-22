default: watchtest

build:
	pnpm build

watchtest:
	pnpm watchtest

.PHONY: test
test:
	pnpm test

clean:
	rm -rf _bitcask*
