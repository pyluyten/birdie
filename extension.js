/*
 *
 * Birdie (Yet another GNOME Shell navigator)
 * Copyright (C) Pierre-Yves LUYTEN 2016 <py@luyten.fr>
 * 
 * birdie is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * birdie is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License along
 * with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


/* Customize this string to edit Birdie shortcuts */
const birdieKeys = "abcdefghijklmnopqrstuvwxyz".split("");

const altTab = imports.ui.altTab;
const AppFavorites = imports.ui.appFavorites;
const Dash = imports.ui.dash;
const Lang = imports.lang;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Overview = imports.ui.overview;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Tweener = imports.ui.tweener;
const Workspace = imports.ui.workspace;
const WorkspacesView = imports.ui.workspacesView;

// see _onOverviewCreated for some variables
let birdieInjections, birdieActors, birdieSignals, birdieNextKeyIdx, birdieBindingsTable, birdieView;
function resetBindingsState() {
    birdieNextKeyIdx = 0;
    birdieBindingsTable = [];
}

function resetState() {
    resetBindingsState();
    birdieInjections = [];
    birdieActors = [ ];
    birdieSignals = [ ];
}

function injectToFunction(parent, name, func)
{
        let origin = parent[name];
        parent[name] = function()
        {
                let ret;
                ret = origin.apply(this, arguments);
                if (ret === undefined)
                        ret = func.apply(this, arguments);
                return ret;
        }
        return origin;
}


/*
      birdieBindingsTable is an array of 2 columns arrays
      [ [ 'a',  MetaWindow1, TYPEWINDOW], [ 'b',  MetaWindow2, TYPEWINDOW] ]

      (so if birdie is to handle more features this should help)
*/

let birdieType = {
  WINDOW: 1,
};

function _onOverviewCreated() {
    resetBindingsState();

    global.display.get_tab_list(Meta.TabList.NORMAL,null).forEach(function(w){
	let CurBinding=[birdieKeys[birdieNextKeyIdx],w, birdieType.WINDOW];
	birdieBindingsTable.push(CurBinding);
	birdieNextKeyIdx++});

    birdieView._workspaces[global.screen.get_active_workspace_index()].showWindowsTooltips();

    // hide() searchEntry or search entry bin
    // issue : if entry.show() or show_all() happens it remains invisible
    // so do not hide it for now
    // Main.overview._searchEntry.hide();
}

function _getBirdieKey (WindowOverlay) {
    var giveup = false;
    var ii = 0;
    
    while (!giveup) {	
        if (!birdieBindingsTable[ii]) {
	    giveup = true;
	}

        else {
	    if (WindowOverlay._windowClone && WindowOverlay._windowClone.metaWindow &&
		WindowOverlay._windowClone.metaWindow == birdieBindingsTable[ii][1])
		return birdieBindingsTable[ii][0];
	}
	ii++;
    }
    return "_";
}

function enable() {
    resetState();
    global.log ("BIRDIE : Enabled");

    Workspace.WindowOverlay.prototype.showTooltip = function() {
	this._text.text = _getBirdieKey(this);
        this._text.raise_top();
        this._text.show();
    }
    birdieInjections['windowoverlay-showTooltip'] = undefined;

    Workspace.WindowOverlay.prototype.hideTooltip = function() {
        if (this._text && this._text.visible)
            this._text.hide();
    }
    birdieInjections['hideTooltip'] = undefined;


/* Workspaces are not supported yet. */
//    Workspace.Workspace.prototype.showTooltip = function() {
//	  if (this._tip == null || this._actualGeometry == null)
//	      return;
//	  this._tip.text = xxxxxx
// 
//	  // Hand code this instead of using _getSpacingAndPadding
//	  // because that fails on empty workspaces
//	  let node = this.actor.get_theme_node();
//	  let padding = {
//	      left: node.get_padding(St.Side.LEFT),
//	      top: node.get_padding(St.Side.TOP),
//	      bottom: node.get_padding(St.Side.BOTTOM),
//	      right: node.get_padding(St.Side.RIGHT),
//	  };
// 
//	  let area = Workspace.padArea(this._actualGeometry, padding);
//	  this._tip.x = area.x;
//	  this._tip.y = area.y;
//	  this._tip.show();
//	  this._tip.raise_top();
//    }
//    workspaceInjections['showTooltip'] = undefined;

// Workspace.Workspace.prototype.hideTooltip = function() {
//    if (this._tip == null)
//        return;
//    if (!this._tip.get_parent())
//        return;
//    this._tip.hide();
// }
// workspaceInjections['hideTooltip'] = undefined;


    Workspace.Workspace.prototype.showWindowsTooltips = function() {
        for (let i in this._windowOverlays) {
            if (this._windowOverlays[i] != null)
                this._windowOverlays[i].showTooltip();
        }
    }
    birdieInjections['workspace-showwindowswooltips'] = undefined;

    Workspace.Workspace.prototype.hideWindowsTooltips = function() {
        for (let i in this._windowOverlays) {
            if (this._windowOverlays[i] != null)
                this._windowOverlays[i].hideTooltip();
        }
    }
    birdieInjections['workspace-hidewindowstooltips'] = undefined;

//   WorkspacesView.WorkspacesView.prototype._hideTooltips = function() {
//       if (global.stage.get_key_focus() == global.stage)
//           global.stage.set_key_focus(this._prevFocusActor);
//       this._pickWindow = false;
//       for (let i = 0; i < this._workspaces.length; i++)
//           this._workspaces[i].hideWindowsTooltips();
//   }
//   workViewInjections['_hideTooltips'] = undefined;
    //
    
//    WorkspacesView.WorkspacesView.prototype._hideWorkspacesTooltips = function() {
//        global.stage.set_key_focus(this._prevFocusActor);
//        this._pickWorkspace = false;
//        for (let i = 0; i < this._workspaces.length; i++)
//            this._workspaces[i].hideTooltip();
//    }
//    birdieInjections['workspacesview-hideworkspacestooltips'] = undefined;


    birdieInjections['windowoverlay-init'] = injectToFunction(Workspace.WindowOverlay.prototype, '_init', function(windowClone, parentActor) {	
        this._id = null;
        birdieActors.push(this._text = new St.Label({ style_class: 'extension-birdie-window-tooltip' }));
        this._text.hide();
        parentActor.add_actor(this._text);
    });
    
    WorkspacesView.WorkspacesView.prototype._onKeyPress = function(s, o) {

	/*  so, "key_code - 97" does not seem to work
	    so instead use key_unicode (meh!) */
	var win = birdieBindingsTable[o.get_key_unicode().charCodeAt(0)-97][1];

	if (win) {
	/*  immediately hide because fade out would be unpleasant */
	    birdieView._workspaces[global.screen.get_active_workspace_index()].hideWindowsTooltips();
	    Main.activateWindow(win, global.get_current_time());
	    return true;
	}
	
	return false;
    }

    birdieInjections['workspacesview-init'] = injectToFunction(WorkspacesView.WorkspacesView.prototype, '_init', function(width, height, x, y, workspaces) {
	birdieView = this;
        this._keyPressEventId = global.stage.connect('key-press-event', Lang.bind(this, this._onKeyPress));
	birdieSignals.push({ obj: global.stage, id: this._keyPressEventId });
    });

    birdieInjections['overview-show']=injectToFunction(Overview.Overview.prototype, 'show',  _onOverviewCreated);
}


function removeInjection(object, injection, name)
{
        if (injection[name] === undefined)
                delete object[name];
        else
                object[name] = injection[name];
}

function disable() {
    var i;

    removeInjection(Overview, birdieInjections,  'windowoverlay-showTooltip');
    removeInjection(Overview, birdieInjections,  'window-overlayhideTooltip');
    removeInjection(Overview, birdieInjections,  'workspace-showwindowswooltips');
    removeInjection(Overview, birdieInjections,  'workspace-hidewindowstooltips' );
    removeInjection(Overview, birdieInjections,  'overview-show');
    removeInjection(Overview, birdieInjections,  'windowoverlay-init');
    removeInjection(Overview, birdieInjections,  'workspacesview-init');
    
    // Main.overview._searchEntry.show_all(); // we do not hide for now.
    // don't need to disconnect, key-press connnect was in injected init

    for each (i in birdieActors)
        i.destroy();
    
    resetState();
}

function init() {
    /* do nothing */
}
