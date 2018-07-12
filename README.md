
# Math and logic games

## Setup
Clone or download this repository then, run ```npm install``` to fetch the dependencies (requires Internet connection).

## Development
Other browsers such as chrome require index.html to be hosted, so either (1) move the repository folder to a htdocs folder, or (2) run ```php -S localhost:8888 -t repository-folder```.

Then run ```npm run weebopack``` then open the index.html in the browser. 

## Deployment
run ```./build``` the files will be at the build/gamed, which
can be copied to any webserver directory.


## Code remarks
The codebase is a mess, to put it mildly. There are several reasons for this:

- I decided to implement my own module/object system. If there is one blunder I've
made in this project, it's this one. It made the whole codebase horrible to
work with.

- I wanted to port the code to typescript, but I quit quarter-way through
because I've already written too much code--code that uses my modules.

- It's written in javascript. No, javascript with ES6 is really nice,
but with javascript, it's too easy to cut corners and try crazy things
with dynamic typing.

## Assets
I couldn't make proper attribution to where exactly I got my assets,
since I just hapzardly downloaded assets from the internet,
but if someone complains about it and points to source, I'll take proper action
and give credit where it's due.
