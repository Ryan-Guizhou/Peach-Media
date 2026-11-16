'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {render}=require('./generate.cjs');
function parseArgs(args){const options={};for(let i=0;i<args.length;i+=2){const key=args[i],value=args[i+1];if(!['--input','--out'].includes(key)||!value)throw Error('Usage: node scripts/cli.cjs --input schema.json --out ./generated');options[key]=value;}if(!options['--input']||!options['--out'])throw Error('Missing --input or --out');return options;}
function main(){const options=parseArgs(process.argv.slice(2));const schema=JSON.parse(fs.readFileSync(path.resolve(options['--input']),'utf8'));const {files}=render(schema);const root=path.resolve(options['--out']);if(fs.existsSync(root)&&fs.readdirSync(root).length)throw Error('Output directory must be empty. Refusing to overwrite files.');fs.mkdirSync(root,{recursive:true});for(const f of files){const target=path.resolve(root,f.path);if(!target.startsWith(root+path.sep))throw Error('Invalid generated path');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,f.content,{encoding:'utf8',flag:'wx'});}console.log(`Generated ${files.length} files in ${root}`);}
if(require.main===module){try{main();}catch(err){console.error(err.message);process.exitCode=1;}}
module.exports={parseArgs};
