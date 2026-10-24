import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
const source=readFileSync('scripts/upload-phase02-branding-fixtures.ts','utf8');
const match=source.match(/Buffer\.from\('([^']+)', 'base64'\)/);
test('synthetic branding payload has intact PNG signature and decodable IDAT',()=>{
 assert.ok(match,'embedded PNG payload found');
 const bytes=Buffer.from(match[1],'base64');
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 const types:string[]=[];let offset=8;let raw=Buffer.alloc(0);
 while(offset<bytes.length){const size=bytes.readUInt32BE(offset);const type=bytes.toString('ascii',offset+4,offset+8);const data=bytes.subarray(offset+8,offset+8+size);const checksum=bytes.readUInt32BE(offset+8+size);let crc=0xffffffff;for(const b of Buffer.concat([Buffer.from(type),data])){crc^=b;for(let j=0;j<8;j++)crc=(crc&1)?(crc>>>1)^0xedb88320:crc>>>1;}assert.equal((crc^0xffffffff)>>>0,checksum,'chunk CRC '+type);if(type==='IDAT')raw=Buffer.concat([raw,data]);types.push(type);offset+=12+size;}
 assert.deepEqual(types,['IHDR','IDAT','IEND']);
 assert.ok(inflateSync(raw).length>=4,'IDAT must decode to pixel scanline');
});
