const { ISubtitle } = require('crunchyroll-lib/models/ISubtitle');
const { DOMParser } = require('crunchyroll-lib/services/xml/DOMParser');
const { Document } = require('crunchyroll-lib/services/xml/Document');
const { Element } = require('crunchyroll-lib/services/xml/Element');

class BaseXMLModel {

  constructor(element) {
    this._element = element;
  }

  _getElement(tagName) {
    const children = this._element.children;
    for (let i = 0; i < children.length; i++) {
      if (children[i].tagName === tagName) {
        return children[i];
      }
    }
    throw new Error("Element " + tagName + " not found.");
  }
}

class SubtitleXMLModel extends BaseXMLModel {
  get title() {
    return this._element.getAttribute("title");
  }
  get langCode() {
    return this._element.getAttribute("lang_code");
  }
  get langSting() {
    return this._element.getAttribute("lang_string");
  }

  get wrapStyle() {
    return this._element.getAttribute("wrap_style");
  }

  get playResX() {
    return this._element.getAttribute("play_res_x");
  }

  get playResY() {
    return this._element.getAttribute("play_res_y");
  }

  get styles() {
    return this._getElement("styles")
      .getElementsByTagName("style")
      .map(x => new SubtitleStyleXMLModel(x));
  }

  get events() {
    return this._getElement("events")
      .getElementsByTagName("event")
      .map(x => new SubtitleEventXMLModel(x));
  }
}

class SubtitleStyleXMLModel extends BaseXMLModel {
  get name() {
    return this._element.getAttribute("name");
  }

  get fontName() {
    return this._element.getAttribute("font_name");
  }

  get fontSize() {
    return this._element.getAttribute("font_size");
  }

  get primaryColour() {
    return this._element.getAttribute("primary_colour");
  }

  get secondaryColour() {
    return this._element.getAttribute("secondary_colour");
  }

  get outlineColour() {
    return this._element.getAttribute("outline_colour");
  }

  get backColour() {
    return this._element.getAttribute("back_colour");
  }

  get bold() {
    return this._element.getAttribute("bold") === '1' ? '-1' : '0';
  }

  get italic() {
    return this._element.getAttribute("italic") === '1' ? '-1' : '0';
  }

  get underline() {
    return this._element.getAttribute("underline") === '1' ? '-1' : '0';
  }

  get strikeout() {
    return this._element.getAttribute("strikeout") === '1' ? '-1' : '0';
  }

  get scaleX() {
    return this._element.getAttribute("scale_x");
  }

  get scaleY() {
    return this._element.getAttribute("scale_y");
  }

  get spacing() {
    return this._element.getAttribute("spacing");
  }

  get angle() {
    return this._element.getAttribute("angle");
  }

  get borderStyle() {
    return this._element.getAttribute("border_style");
  }

  get outline() {
    return this._element.getAttribute("outline");
  }

  get shadow() {
    return this._element.getAttribute("shadow");
  }

  get alignment() {
    return this._element.getAttribute("alignment");
  }

  get marginL() {
    return this._element.getAttribute("margin_l");
  }

  get marginR() {
    return this._element.getAttribute("margin_r");
  }

  get marginV() {
    return this._element.getAttribute("margin_v");
  }

  get encoding() {
    return this._element.getAttribute("encoding");
  }
}

class SubtitleEventXMLModel extends BaseXMLModel {
  get start() {
    return this._element.getAttribute("start");
  }

  get end() {
    return this._element.getAttribute("end");
  }

  get style() {
    return this._element.getAttribute("style");
  }

  get name() {
    return this._element.getAttribute("name");
  }

  get marginL() {
    return this._element.getAttribute("margin_l");
  }

  get marginR() {
    return this._element.getAttribute("margin_r");
  }

  get marginV() {
    return this._element.getAttribute("margin_v");
  }

  get effect() {
    return this._element.getAttribute("effect");
  }

  get text() {
    return this._element.getAttribute("text");
  }
}

module.exports = class SubtitleToAss {

  constructor(subtitle) {
    this._subtitle = subtitle;
  }

  async getModel() {
    if (this._model) {
      return this._model;
    }
    const content = await this._subtitle.getContentAsString();
    const document = await (new DOMParser()).parseFromString(content);

    const subtitleScript = document.getFirstElement();
    if (!subtitleScript) throw new Error("No content in XML");

    this._model = new SubtitleXMLModel(subtitleScript);
    return this._model;
  }
  async getContentAsAss() {
    const model = await this.getModel();

    let output = '[Script Info]\n';
    output += "Title: " + model.title + "\n";
    output += "ScriptType: v4.00+\n";
    output += "WrapStyle: " + model.wrapStyle + "\n";
    output += "PlayResX: " + model.playResX + "\n";
    output += "PlayResY: " + model.playResY + "\n";
    output += "\n";
    output += "[V4+ Styles]\n";
    output += "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n";
    const styles = model.styles;
    for (let i = 0; i < styles.length; i++) {
      output += "Style: " + styles[i].name;
      output += ", " + styles[i].fontName;
      output += ", " + styles[i].fontSize;
      output += ", " + styles[i].primaryColour;
      output += ", " + styles[i].secondaryColour;
      output += ", " + styles[i].outlineColour;
      output += ", " + styles[i].backColour;
      output += ", " + styles[i].bold;
      output += ", " + styles[i].italic;
      output += ", " + styles[i].underline;
      output += ", " + styles[i].strikeout;
      output += ", " + styles[i].scaleX;
      output += ", " + styles[i].scaleY;
      output += ", " + styles[i].spacing;
      output += ", " + styles[i].angle;
      output += ", " + styles[i].borderStyle;
      output += ", " + styles[i].outline;
      output += ", " + styles[i].shadow;
      output += ", " + styles[i].alignment;
      output += ", " + styles[i].marginL;
      output += ", " + styles[i].marginR;
      output += ", " + styles[i].marginV;
      output += ", " + styles[i].encoding;
      output += "\n";
    }

    output += "\n";
    output += "[Events]\n";
    output += "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n";

    const events = model.events;
    for (let i = 0; i < events.length; i++) {
      output += "Dialogue: 0";
      output += ", " + events[i].start;
      output += ", " + events[i].end;
      output += ", " + events[i].style;
      output += ", " + events[i].name;
      output += ", " + events[i].marginL;
      output += ", " + events[i].marginR;
      output += ", " + events[i].marginV;
      output += ", " + events[i].effect;
      output += ", " + events[i].text;
      output += "\n";
    }

    return output;
  }
}