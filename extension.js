// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-

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
const Clutter = imports.gi.Clutter;
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
let birdieInjections, birdieActors, birdieSignals, birdieNextKeyIdx, birdieBindingsTable, birdieView, birdieApps, birdieListen;

function resetBindingsState() {
    birdieListen = true;
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

const birdieType = {
    WINDOW: 1,          // MetaWindow
    FAVOURITE: 2,       // Dash.Actor
};

function _onOverviewCreated() {
    var CurBinding;
    resetBindingsState();

    /* assign bindings to Dash */
    var children = Main.overview._dash._box.get_children().filter(function(actor) {
	return actor.child &&
               actor.child._delegate &&
               actor.child._delegate.app;
    });

    children.forEach(function(a){
	CurBinding=[birdieKeys[birdieNextKeyIdx],a, birdieType.FAVOURITE];
	birdieBindingsTable.push(CurBinding);
	birdieNextKeyIdx++;});

    /* assign bindings to AltTab */
    global.display.get_tab_list(Meta.TabList.NORMAL,null).forEach(function(w){
	CurBinding=[birdieKeys[birdieNextKeyIdx],w, birdieType.WINDOW];
	birdieBindingsTable.push(CurBinding);
	birdieNextKeyIdx++});

    /* show tooltips */
    birdieView._workspaces[global.screen.get_active_workspace_index()].showWindowsTooltips();
    Main.overview._dash.showTooltips();


    // hide() searchEntry or search entry bin
    // issue : if entry.show() or show_all() happens it remains invisible
    // so do not hide it for now
    // Main.overview._searchEntry.hide();
}


function _getBirdieKey (item, type) {
    var giveup = false;
    var ii = 0;

    while (!giveup) {
        if (!birdieBindingsTable[ii]) {
	    giveup = true;
	}

        else {
            /* item is DashItemContainer */
            if (type == birdieType.FAVOURITE)
	        if (item.child && item.child._delegate) {
                    if (item == birdieBindingsTable[ii][1])
		        return birdieBindingsTable[ii][0];
	        }

            /* item is WindowOverlay */
            if (type == birdieType.WINDOW)
	        if (item._windowClone && item._windowClone.metaWindow &&
		    item._windowClone.metaWindow == birdieBindingsTable[ii][1])
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
	this._text.text = _getBirdieKey(this, birdieType.WINDOW);
        this._text.raise_top();
        this._text.show();
    }
    birdieInjections['windowoverlay-showtooltip'] = undefined;

    Workspace.WindowOverlay.prototype.hideTooltip = function() {
        if (this._text && this._text.visible)
            this._text.hide();
    }
    birdieInjections['windowoverlay-hidetooltip'] = undefined;


    Dash.DashItemContainer.prototype.showTooltip = function() {
        this.setLabelText(_getBirdieKey(this, birdieType.FAVOURITE));
        this.showLabel();
    }
    birdieInjections['dashitemcontainer-showtooltip'] = undefined;

    
    Dash.DashItemContainer.prototype.hideTooltip = function() {
        this.hideLabel();
    }
    birdieInjections['dashitemcontainer-hidetooltip'] = undefined;

    Workspace.Workspace.prototype.showWindowsTooltips = function() {
        for (let i in this._windowOverlays) {
            if (this._windowOverlays[i] != null)
                this._windowOverlays[i].showTooltip();
        }
    }
    birdieInjections['workspace-showwindowstooltips'] = undefined;

    Workspace.Workspace.prototype.hideWindowsTooltips = function() {
        for (let i in this._windowOverlays) {
            if (this._windowOverlays[i] != null)
                this._windowOverlays[i].hideTooltip();
        }
    }
    birdieInjections['workspace-hidewindowstooltips'] = undefined;

    Dash.Dash.prototype.showTooltips = function() {

        var children = Main.overview._dash._box.get_children().filter(function(actor) {
	return actor.child &&
               actor.child._delegate &&
               actor.child._delegate.app;
        });

        children.forEach(function(a){
            a.showTooltip();
        });

    }
    birdieInjections['dash-showtooltips'] = undefined;


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
	if (!birdieListen)
	    return false;

	if (o.get_key_symbol() == Clutter.KEY_space) {
	    birdieView._workspaces[global.screen.get_active_workspace_index()].hideWindowsTooltips();
	    birdieListen = false;
	    return true;
	}

	/*  so, "key_code - 97" does not seem to work
	    so instead use key_unicode (meh!) */
	var idx = o.get_key_unicode().charCodeAt(0)-97;
	var birdieObj = birdieBindingsTable[idx][1];
	var curType = birdieBindingsTable[idx][2];

	if (birdieObj) {
	    /*  immediately hide because fade out would be unpleasant */
	    birdieView._workspaces[global.screen.get_active_workspace_index()].hideWindowsTooltips();

	    /*  then switch to window or launch app */
	    if (curType == birdieType.WINDOW)
		Main.activateWindow(birdieObj, global.get_current_time());

	    if (curType == birdieType.FAVOURITE)
		birdieObj.child._delegate.app.open_new_window(-1);

	    return true;
	}

	return false;
    }
    birdieInjections['workspacesview-onkeypress'] = undefined;

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

    removeInjection(Overview, birdieInjections,  'windowoverlay-showtooltip');
    removeInjection(Overview, birdieInjections,  'windowoverlay-hidetooltip');
    removeInjection(Overview, birdieInjections,  'workspace-showwindowswooltips');
    removeInjection(Overview, birdieInjections,  'workspace-hidewindowstooltips' );
    removeInjection(Overview, birdieInjections,  'dashitemcontainer-showtooltip');
    removeInjection(Overview, birdieInjections,  'dashitemcontainer-hidetooltip');
    removeInjection(Overview, birdieInjections,  'dash-showtooltips');
    removeInjection(Overview, birdieInjections,  'dash-hidetooltips');
    removeInjection(Overview, birdieInjections,  'overview-show');
    removeInjection(Overview, birdieInjections,  'windowoverlay-init');
    removeInjection(Overview, birdieInjections,  'workspacesview-init');
    removeInjection(Overview, birdieInjections,  'workspacesview-onkeypress');

    // Main.overview._searchEntry.show_all(); // we do not hide for now.
    // don't need to disconnect, key-press connnect was in injected init

    for each (i in birdieActors)
        i.destroy();

    resetState();
}

function init() {
    /* do nothing */
}
