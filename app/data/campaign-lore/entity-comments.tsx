"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionForm, SubmitButton } from "../../components/form-feedback";
import { createEntityComment } from "../actions";
import {
  ENTITY_COMMENT_EVENT,
  type RealtimeEntityComment,
} from "../notifications/entity-comment-event";

type Comment = { id: string; username: string; content: string; created_at: string };

export default function EntityComments({
  entityId,
  initialComments,
}: {
  entityId: string;
  initialComments: Comment[];
}) {
  const [liveComments, setLiveComments] = useState<Comment[]>([]);
  const comments = useMemo(() => {
    const byId = new Map(initialComments.map((comment) => [comment.id, comment]));
    for (const comment of liveComments) byId.set(comment.id, comment);
    return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [initialComments, liveComments]);

  useEffect(() => {
    function receiveComment(event: Event) {
      const comment = (event as CustomEvent<RealtimeEntityComment>).detail;
      if (comment.entityId !== entityId) return;
      setLiveComments((current) =>
        current.some((item) => item.id === comment.id)
          ? current
          : [{
              id: comment.id,
              username: comment.username,
              content: comment.content,
              created_at: comment.createdAt,
            }, ...current],
      );
    }
    window.addEventListener(ENTITY_COMMENT_EVENT, receiveComment);
    return () => window.removeEventListener(ENTITY_COMMENT_EVENT, receiveComment);
  }, [entityId]);

  return (
    <div>
      <h2>Comments</h2>
      <ActionForm
        action={createEntityComment}
        className="comment-form"
        errorMessage="We couldn’t post that comment. Please try again."
      >
        <input type="hidden" name="entityId" value={entityId} />
        <textarea name="content" placeholder="Add a comment" required rows={3} />
        <SubmitButton variant="filled" pendingLabel="Posting…">Comment</SubmitButton>
      </ActionForm>
      <div className="comments" aria-live="polite">
        {comments.map((comment) => (
          <article key={comment.id}>
            <strong>{comment.username}</strong>
            <p>{comment.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
