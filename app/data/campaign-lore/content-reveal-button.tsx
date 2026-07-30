"use client";

import { useState } from "react";
import { changeEntityContentReveal, revealEntityContentToPlayers } from "@/app/data/actions";
import { ActionForm, SubmitButton } from "@/app/components/form-feedback";

type Player = { id: string; username: string };

export default function ContentRevealButton({
  contentId,
  contentType,
  players,
  revealedToAll,
  revealedProfileIds,
  canChangeReveal,
  currentUserId,
}: {
  contentId: string;
  contentType: "textbox" | "image";
  players: Player[];
  revealedToAll: boolean;
  revealedProfileIds: string[];
  canChangeReveal: boolean;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [allPlayers, setAllPlayers] = useState(revealedToAll);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const playerRevealTargets = players.filter((player) => player.id !== currentUserId);
  const revealLabel = revealedToAll
    ? "Revealed to all"
    : revealedProfileIds.length
      ? `Revealed to ${revealedProfileIds.length}`
      : "Hidden";

  if (!canChangeReveal && revealedToAll) return null;

  const action = canChangeReveal ? changeEntityContentReveal : revealEntityContentToPlayers;

  return (
    <>
      <button className="content-action" onClick={() => setOpen(true)} type="button">
        {canChangeReveal ? "Change reveal" : "Reveal"}
        {canChangeReveal && <span className="reveal-status">{revealLabel}</span>}
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
            <h2 id={`reveal-${contentId}`}>
              {canChangeReveal ? "Change reveal" : "Reveal to other players"}
            </h2>
            <p>
              {canChangeReveal
                ? `Choose which campaign players can see this ${contentType}.`
                : `Choose which other players can see this ${contentType}. You cannot unreveal it; only the GM can.`}
            </p>
            <ActionForm
              action={action}
              errorMessage="We couldn’t reveal this lore. Refresh the page and try again."
              onSuccess={() => {
                setOpen(false);
                setSelectedPlayers([]);
              }}
              className="dialog-form reveal-form"
              onSubmit={(event) => {
                if (
                  !canChangeReveal &&
                  !window.confirm(
                    "Are you sure? Once you reveal this lore, you cannot unreveal it; only the GM can.",
                  )
                ) {
                  event.preventDefault();
                }
              }}
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
                {(canChangeReveal ? players : playerRevealTargets).length ? (
                  (canChangeReveal ? players : playerRevealTargets).map((player) => {
                    const alreadyRevealed =
                      !canChangeReveal && revealedProfileIds.includes(player.id);
                    return (
                      <label className="reveal-option" key={player.id}>
                        <input
                          defaultChecked={revealedProfileIds.includes(player.id)}
                          disabled={alreadyRevealed}
                          name="profileId"
                          onChange={(event) =>
                            setSelectedPlayers((selected) =>
                              event.target.checked
                                ? [...selected, player.id]
                                : selected.filter((id) => id !== player.id),
                            )
                          }
                          type="checkbox"
                          value={player.id}
                        />
                        <span>
                          @{player.username}
                          {alreadyRevealed && <small>Already knows this lore</small>}
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <p>No other players have been added to this campaign yet.</p>
                )}
              </fieldset>
              {canChangeReveal && (
                <p className="setting-description">
                  Leave every option unchecked to hide this content from all players.
                </p>
              )}
              <div className="dialog-actions">
                <button className="text-action" onClick={() => setOpen(false)} type="button">
                  Cancel
                </button>
                <SubmitButton
                  variant="filled"
                  disabled={!canChangeReveal && !allPlayers && selectedPlayers.length === 0}
                  pendingLabel="Revealing…"
                >
                  {canChangeReveal ? "Save reveal" : "Reveal"}
                </SubmitButton>
              </div>
            </ActionForm>
          </section>
        </div>
      )}
    </>
  );
}
