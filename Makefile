default: watchtest

watchtest:
	pnpm watchtest

.PHONY: test
test:
	pnpm test

clean:
	rm -rf bitcask*
