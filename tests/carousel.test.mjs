import test from 'node:test';
import assert from 'node:assert/strict';
import {slideIndex,nextRemaining,swipeDirection} from '../app/carousel-model.ts';
test('slides retain identity through insertion, removal and reorder and clamp at the end',()=>{
 assert.equal(slideIndex(['a','b','c'],'b',0),1);
 assert.equal(slideIndex(['x','a','b','c'],'b',1),2);
 assert.equal(slideIndex(['a','c'],'b',1),1);
 assert.equal(slideIndex(['a'],'c',2),0);
 assert.equal(slideIndex([],undefined,8),0);
});
test('completing a meal advances chronologically, wraps to earlier pending meals and handles completion',()=>{
 const ids=['breakfast','lunch','dinner'];
 assert.equal(nextRemaining(ids,'breakfast',['lunch','dinner']),'lunch');
 assert.equal(nextRemaining(ids,'lunch',['breakfast','dinner']),'dinner');
 assert.equal(nextRemaining(ids,'dinner',['breakfast']),'breakfast');
 assert.equal(nextRemaining(ids,'dinner',[]),undefined);
});
test('only deliberate horizontal swipes change slides; vertical scrolling and taps do not',()=>{
 assert.equal(swipeDirection(-100,20),1);assert.equal(swipeDirection(80,10),-1);
 assert.equal(swipeDirection(-40,0),0);assert.equal(swipeDirection(-80,100),0);assert.equal(swipeDirection(0,0),0);
});
