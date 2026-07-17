"use client";

import { useState } from "react";
import { changeEntityContentReveal } from "@/app/data/actions";

type Player = { id: string; username: string };

export default function ContentRevealButton({
  contentId,
  contentType,
  players,
  revealedToAll,
  revealedProfileIds,
}: {
  contentId: string;
  contentType: "textbox" | "image";
  players: Player[];
  revealedToAll: boolean;
  revealedProfileIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [allPlayers, setAllPlayers] = useState(revealedToAll);
  const revealLabel = revealedToAll
    ? "Revealed to all"
    : revealedProfileIds.length
      ? `Revealed to ${revealedProfileIds.length}`
      : "Hidden";

  return (
    <>
      <button className="content-action" onClick={() => setOpen(true)} type="button">
        Change reveal
        <span className="reveal-status">{revealLabel}</span>
      </button>
      {open && (
        <div className="dialog-scrim" onMouseDown={() => setOpen(false)}>
          <section
            aria-labelledby={`reveal-${contentId}`}
            aria-modal="true"
            className="creation-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <h2 id={`reveal-${contentId}`}>Change reveal</h2>
            <p>Choose which campaign players can see this {contentType}.</p>
            <form
              action={async (formData) => {
                await changeEntityContentReveal(formData);
                setOpen(false);
              }}
              className="dialog-form reveal-form"
            >
              <input type="hidden" name="contentId" value={contentId} />
              <input type="hidden" name="contentType" value={contentType} />
              <label className="reveal-option reveal-all-option">
                <input
                  checked={allPlayers}
                  name="revealToAll"
                  onChange={(event) => setAllPlayers(event.target.checked)}
                  type="checkbox"
                  value="true"
                />
                <span>
                  <strong>All players</strong>
                  <small>Includes everyone currently in the campaign and anyone added later.</small>
                </span>
              </label>
              <fieldset className="reveal-player-options" disabled={allPlayers}>
                <legend>Specific players</legend>
                {players.length ? (
                  players.map((player) => (
                    <label className="reveal-option" key={player.id}>
                      <input
                        defaultChecked={revealedProfileIds.includes(player.id)}
                        name="profileId"
                        type="checkbox"
                        value={player.id}
                      />
                      <span>@{player.username}</span>
                    </label>
                  ))
                ) : (
                  <p>No players have been added to this campaign yet.</p>
                )}
              </fieldset>
              <p className="setting-description">
                Leave every option unchecked to hide this content from all players.
              </p>
              <div className="dialog-actions">
                <button className="text-action" onClick={() => setOpen(false)} type="button">
                  Cancel
                </button>
                <button className="filled-action">Save reveal</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
