var stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');

stdin.on('data', function(key){
    if (key == '\u001B\u005B\u0041') {
        process.stdout.write('up');
    }
    if (key == '\u001B\u005B\u0043') {
        process.stdout.write('right');
    }
    if (key == '\u001B\u005B\u0042') {
        process.stdout.write('down');
    }
    if (key == '\u001B\u005B\u0044') {
        process.stdout.write('left');
    }

    if (key == '\u0003') { process.exit(); }    // ctrl-c
});

async function junk(){
  console.log("I never run")
}
