

function alert(msg, title) {
  title = title || "alert";
  var app = [NSApplication sharedApplication];
  [app displayDialog:msg withTitle:title];
}

function attrbutesFromString(string) {
  return  string.attributesAtIndex_effectiveRange(0, nil)
}
function getFontFromAttributedString(string) {
  var dict = attrbutesFromString(string)
  return dict["NSFont"]
}
function getParagraphStyleFromAttributedString(string) {
  var dict = attrbutesFromString(string)
  return dict["NSParagraphStyle"]
}
function getLineHeight(font) {
  return font.ascender() - font.descender() + font.leading()
}

function getMaskAndTextLayer(group) {
  var children = group.children()
  var textLayer = nil
  var shape = nil
  for (var i=0; i<children.count(); i++) {
    var obj = children[i]
    if ([obj isKindOfClass:[MSTextLayer class]]) {
      textLayer = obj
    }
    if ([obj isKindOfClass:[MSShapeGroup class]]) {
      shape = obj
    }
  }
  return [shape, textLayer]
}

// --------------------- fix margin -------------------------


function getFixMargin(textLayer) {
  var attributedString = textLayer.attributedString().attributedString()
  var style = getParagraphStyleFromAttributedString(attributedString)
  var minimuxLineHeight = style.minimumLineHeight()
  var font = textLayer.font()
  var lineHeight = getLineHeight(font)

  if (!font.fontName().hasPrefix("SF")) {
    alert(font, "Bad Font. Plugin only valid for SanFrancisco (SF UI or SF Pro) Font family.")
  }
  var margin = (minimuxLineHeight - lineHeight) / 2
  return margin
}


function trimVerticalMargin(textLayer, margin) {
  var originalFrame = textLayer.frame().rect()
  var originalCenter = textLayer.center()

  var targetFrame = originalFrame
  targetFrame.size.height -= margin * 2
  targetFrame.size.height = Math.ceil(targetFrame.size.height)

  var rect = MSShapeGroup.shapeWithRect(targetFrame)
  textLayer.parentGroup().addLayer(rect)

  var layers = MSLayerArray.arrayWithLayers([rect, textLayer]])
  var group = MSMaskWithShape.createMaskWithShapeForLayers(layers)
  group.center = originalCenter
  textLayer.frame().y = -margin
}

function fixMargin(layer) {
  if ([layer isKindOfClass:[MSTextLayer class]]) {

    // chose textLayer directly
    var textLayer = layer;
    var margin = getFixMargin(textLayer)
    if (margin <= 0) {
      return
    }
    var group = trimVerticalMargin(textLayer, margin)

  } else if ([layer isKindOfClass:[MSLayerGroup class]]) {

    // resize grouped
    var group = layer
    var list = getMaskAndTextLayer(group)
    var textLayer = list[1]
    var shape = list[0]
    var margin = getFixMargin(textLayer)
    if (shape == nil || textLayer == nil) {
      return
    }
    shape.frame().x = 0
    shape.frame().y = 0
    shape.frame().width = textLayer.frame().width()
    shape.frame().height = Math.ceil(textLayer.frame().height() - margin * 2)
    textLayer.frame().x = 0
    textLayer.frame().y = -margin
    group.resizeToFitChildrenWithOption(0)
    group.name = textLayer.name()
  }
}

function onFixRun(context) {
  // var document = context.document
  // document.displayMessage("Dynamic Button")

  var selection = context.selection;
  for (var i=0; i<selection.count(); i++) {
    var layer = selection[i]
    fixMargin(layer)
  }
};


// --------------------- set line height -------------------------

function setLineHeight(textLayer, lineHeigthMutiple) {

  var font = textLayer.font()
  var lineHeight = getLineHeight(font)
  // sketch only render in integer line height
  let finalHeight = Math.ceil(lineHeight * lineHeigthMutiple)
  textLayer.setLineHeight(finalHeight)

  // Change back the font.
  //
  // `setLineHeight` will change font to PingFangSC when the text is pure Chinese
  // and font is SFUI. So we should change it back.
  // Only use the mehtod below we can get the result we want.
  // When using `setFont`,'setFontPostscriptName' and text is Chinese, SFUI font
  // will automatically fall to PingFangSC.
  var attrS = textLayer.attributedString().attributedString().mutableCopy()
  attrS.addAttribute_value_range("NSFont", font, NSMakeRange(0,attrS.length()))
  var newValue = MSAttributedString.alloc().initWithAttributedString(attrS)
  textLayer.attributedString = newValue
}

function onSetLineHeight(context) {

  var document = context.document
  var input = [document askForUserInput:"Line Height Multiple:" initialValue:1.2]
  if (input == nil) {
    return
  }
  var multiple = parseFloat(input);

  var selection = context.selection;
  for (var i=0; i<selection.count(); i++) {
    var layer = selection[i];
    if ([layer isKindOfClass:[MSTextLayer class]]) {

      setLineHeight(layer, multiple)
      fixMargin(layer)

    } else if ([layer isKindOfClass:[MSLayerGroup class]]) {

      // resize grouped
      var group = layer
      var list = getMaskAndTextLayer(group)
      var textLayer = list[1]

      setLineHeight(textLayer, multiple)
      fixMargin(group)
    }
  }
}
