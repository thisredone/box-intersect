'use strict'

module.exports = boxIntersectWrapper

var pool = require('typedarray-pool')
var sweep = require('./lib/sweep')
var boxIntersectIter = require('./lib/intersect')


function convertBoxes(boxes, d, data, ids, length) {
  var ptr = 0
  var count = 0
  for(var i=0, n=length; i<n; ++i) {
    var b = boxes[i]
    if(b._removed) {
      continue
    }
    for(var j=0; j<2*d; ++j) {
      data[ptr++] = b.bbox[j]
    }
    ids[count++] = i
  }
  return count
}


function boxIntersectSame(red, length, _visit) {
  var visit = (i, j) => _visit(red[i], red[j])
  var n = red.length;
  if(n <= 0) return;

  var d = (red[0].bbox.length)>>>1
  var retval

  var redList  = pool.mallocDouble(2*d*n)
  var redIds   = pool.mallocInt32(n)
  n = convertBoxes(red, d, redList, redIds, length)

  if(n > 0) {
    sweep.init(n + n)
    retval = boxIntersectIter(
      d, visit,    true,
      n, redList,  redIds,
      n, redList,  redIds)
  }

  pool.free(redList)
  pool.free(redIds)

  return retval
}


function boxIntersectOther(red, redLength, blue, blueLength, _visit) {
  var visit = (i, j) => _visit(red[i], blue[j])

  var n = red.length;
  var m = blue.length;
  if(n <= 0) return;

  var d = (red[0].bbox.length)>>>1
  var retval


  var redList  = pool.mallocDouble(2*d*n)
  var redIds   = pool.mallocInt32(n)
  n = convertBoxes(red, d, redList, redIds, redLength)

  if(n > 0) {
    var blueList  = pool.mallocDouble(2*d*m)
    var blueIds   = pool.mallocInt32(m)
    m = convertBoxes(blue, d, blueList, blueIds, blueLength)

    if(m > 0) {
      sweep.init(n + m)
      retval = boxIntersectIter(
        d, visit,    false,
        n, redList,  redIds,
        m, blueList, blueIds)
    }

    pool.free(blueList)
    pool.free(blueIds)

  }

  pool.free(redList)
  pool.free(redIds)

  return retval
}


function boxIntersectWrapper(arg0, arg1, arg2, arg3, arg4) {
  var result
  switch(arguments.length) {
    case 2:
      return boxIntersectSame(arg0, arg0.length, arg1)
    case 3:
      if(Array.isArray(arg1)) {
        return boxIntersectOther(arg0, arg0.length, arg1, arg1.length, arg2)
      } else {
        return boxIntersectSame(arg0, arg1, arg2)
      }
    case 5:
      return boxIntersectOther(arg0, arg1, arg2, arg3, arg4)
    default:
      throw new Error('box-intersect: Invalid arguments')
  }
}