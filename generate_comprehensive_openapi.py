#!/usr/bin/env python3
"""
Enhanced Mastodon OpenAPI Generator

This script creates a comprehensive OpenAPI specification for the Mastodon API
based on real documentation structure and common API patterns.
"""

import json
import re
import yaml
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field

@dataclass
class ParameterInfo:
    name: str
    type: str
    description: str
    required: bool = False
    location: str = "query"

@dataclass
class ResponseInfo:
    status_code: str
    description: str
    schema_ref: Optional[str] = None

@dataclass
class EndpointInfo:
    path: str
    method: str
    summary: str
    description: str
    parameters: List[ParameterInfo] = field(default_factory=list)
    responses: List[ResponseInfo] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)

@dataclass
class PropertyInfo:
    name: str
    type: str
    description: str
    required: bool = True
    nullable: bool = False
    format: Optional[str] = None
    items_ref: Optional[str] = None

@dataclass
class EntityInfo:
    name: str
    description: str
    properties: List[PropertyInfo] = field(default_factory=list)

class ComprehensiveMastodonGenerator:
    def __init__(self):
        self.entities: Dict[str, EntityInfo] = {}
        self.endpoints: List[EndpointInfo] = []

    def create_comprehensive_entities(self):
        """Create comprehensive entities based on Mastodon API documentation"""
        
        # Account entity with all known fields
        account = EntityInfo(
            name="Account",
            description="Represents a user of Mastodon and their associated profile."
        )
        account.properties = [
            PropertyInfo("id", "string", "The account id"),
            PropertyInfo("username", "string", "The username of the account, not including domain"),
            PropertyInfo("acct", "string", "The Webfinger account URI. Equal to username for local users, or username@domain for remote users"),
            PropertyInfo("display_name", "string", "The profile's display name"),
            PropertyInfo("locked", "boolean", "Whether the account manually approves follow requests"),
            PropertyInfo("bot", "boolean", "Whether the account may perform automated actions"),
            PropertyInfo("discoverable", "boolean", "Whether the account has opted into discovery features", required=False, nullable=True),
            PropertyInfo("group", "boolean", "Whether the account represents a Group actor", required=False),
            PropertyInfo("created_at", "string", "When the account was created", format="date-time"),
            PropertyInfo("note", "string", "The profile's bio / description"),
            PropertyInfo("url", "string", "The location of the user's profile page", format="uri"),
            PropertyInfo("uri", "string", "The user's ActivityPub actor identifier", format="uri", required=False),
            PropertyInfo("avatar", "string", "An image icon that is shown next to statuses and in the profile", format="uri"),
            PropertyInfo("avatar_static", "string", "A static version of the avatar", format="uri"),
            PropertyInfo("header", "string", "An image banner that is shown above the profile", format="uri"),
            PropertyInfo("header_static", "string", "A static version of the header", format="uri"),
            PropertyInfo("followers_count", "integer", "The reported followers of this profile"),
            PropertyInfo("following_count", "integer", "The reported follows of this profile"),
            PropertyInfo("statuses_count", "integer", "How many statuses are attached to this account"),
            PropertyInfo("last_status_at", "string", "When the most recent status was posted", format="date", nullable=True),
            PropertyInfo("noindex", "boolean", "Whether the local user has opted out of being indexed by search engines", required=False, nullable=True),
            PropertyInfo("emojis", "array", "Custom emoji entities to be used when rendering the profile", items_ref="CustomEmoji"),
            PropertyInfo("fields", "array", "Additional metadata attached to a profile as name-value pairs", items_ref="Field"),
            PropertyInfo("moved", "object", "Indicates that the profile is currently inactive and that its user has moved to a new account", nullable=True, required=False),
            PropertyInfo("suspended", "boolean", "An extra attribute returned only when an account is suspended", required=False),
            PropertyInfo("limited", "boolean", "An extra attribute returned only when an account is silenced", required=False),
            PropertyInfo("hide_collections", "boolean", "Whether the user hides the contents of their follows and followers collections", required=False),
        ]
        self.entities["Account"] = account

        # CredentialAccount entity for /api/v1/accounts/verify_credentials
        cred_account = EntityInfo(
            name="CredentialAccount", 
            description="Represents the current user's account with additional private information."
        )
        cred_account.properties = account.properties + [
            PropertyInfo("source", "object", "An extra attribute that contains source values to be used with API methods", required=False),
            PropertyInfo("role", "object", "The role assigned to the currently authorized user", required=False),
        ]
        self.entities["CredentialAccount"] = cred_account

        # Status entity with comprehensive fields
        status = EntityInfo(
            name="Status",
            description="Represents a status posted by an account."
        )
        status.properties = [
            PropertyInfo("id", "string", "ID of the status in the database"),
            PropertyInfo("uri", "string", "URI of the status used for federation", format="uri"),
            PropertyInfo("created_at", "string", "The date when this status was created", format="date-time"),
            PropertyInfo("account", "object", "The account that authored this status"),
            PropertyInfo("content", "string", "HTML-encoded status content"),
            PropertyInfo("visibility", "string", "Visibility of this status"),
            PropertyInfo("sensitive", "boolean", "Is this status marked as sensitive content?"),
            PropertyInfo("spoiler_text", "string", "Subject or summary line, below which status content is collapsed"),
            PropertyInfo("media_attachments", "array", "Media that is attached to this status", items_ref="MediaAttachment"),
            PropertyInfo("application", "object", "The application used to post this status", nullable=True),
            PropertyInfo("mentions", "array", "Mentions of users within the status content", items_ref="Mention"),
            PropertyInfo("tags", "array", "Hashtags used within the status content", items_ref="Tag"),
            PropertyInfo("emojis", "array", "Custom emoji to be used when rendering status content", items_ref="CustomEmoji"),
            PropertyInfo("reblogs_count", "integer", "How many boosts this status has received"),
            PropertyInfo("favourites_count", "integer", "How many favourites this status has received"),
            PropertyInfo("replies_count", "integer", "How many replies this status has received"),
            PropertyInfo("url", "string", "A link to the status's HTML representation", format="uri", nullable=True),
            PropertyInfo("in_reply_to_id", "string", "ID of the status being replied to", nullable=True),
            PropertyInfo("in_reply_to_account_id", "string", "ID of the account being replied to", nullable=True),
            PropertyInfo("reblog", "object", "The status being reblogged", nullable=True),
            PropertyInfo("poll", "object", "The poll attached to the status", nullable=True),
            PropertyInfo("card", "object", "Preview card for links included within status content", nullable=True),
            PropertyInfo("language", "string", "Primary language of this status", nullable=True),
            PropertyInfo("text", "string", "Plain-text source of a status", nullable=True),
            PropertyInfo("edited_at", "string", "Timestamp of when the status was last edited", format="date-time", nullable=True),
            PropertyInfo("favourited", "boolean", "Have you favourited this status?", required=False),
            PropertyInfo("reblogged", "boolean", "Have you boosted this status?", required=False),
            PropertyInfo("muted", "boolean", "Have you muted notifications for this status's conversation?", required=False),
            PropertyInfo("bookmarked", "boolean", "Have you bookmarked this status?", required=False),
            PropertyInfo("pinned", "boolean", "Have you pinned this status?", required=False),
        ]
        self.entities["Status"] = status

        # MediaAttachment entity
        media = EntityInfo(
            name="MediaAttachment",
            description="Represents a file or media attachment that can be added to a status."
        )
        media.properties = [
            PropertyInfo("id", "string", "The ID of the attachment in the database"),
            PropertyInfo("type", "string", "The type of the attachment"),
            PropertyInfo("url", "string", "The location of the original full-size attachment", format="uri"),
            PropertyInfo("preview_url", "string", "The location of a scaled-down preview of the attachment", format="uri"),
            PropertyInfo("remote_url", "string", "The location of the full-size original attachment on the remote website", format="uri", nullable=True),
            PropertyInfo("meta", "object", "Metadata returned by Paperclip"),
            PropertyInfo("description", "string", "Alternate text that describes what is in the media attachment", nullable=True),
            PropertyInfo("blurhash", "string", "A hash computed by the BlurHash algorithm", nullable=True),
        ]
        self.entities["MediaAttachment"] = media

        # Notification entity
        notification = EntityInfo(
            name="Notification",
            description="Represents a notification of an event relevant to the user."
        )
        notification.properties = [
            PropertyInfo("id", "string", "The id of the notification in the database"),
            PropertyInfo("type", "string", "The type of event that resulted in the notification"),
            PropertyInfo("created_at", "string", "The timestamp of the notification", format="date-time"),
            PropertyInfo("account", "object", "The account that performed the action that generated the notification"),
            PropertyInfo("status", "object", "Status that was the object of the notification", nullable=True),
            PropertyInfo("report", "object", "Report that was the object of the notification", nullable=True, required=False),
            PropertyInfo("relationship_severance_event", "object", "Summary of the event that caused follow relationships to be severed", nullable=True, required=False),
        ]
        self.entities["Notification"] = notification

        # Additional essential entities
        entities_data = [
            ("CustomEmoji", "Represents a custom emoji.", [
                ("shortcode", "string", "The name of the custom emoji"),
                ("url", "string", "A link to the custom emoji", "uri"),
                ("static_url", "string", "A link to a static copy of the custom emoji", "uri"),
                ("visible_in_picker", "boolean", "Whether this Emoji should be visible in the picker or unlisted"),
                ("category", "string", "Used for sorting custom emoji in the picker", True),
            ]),
            ("Field", "Represents a profile field as a name-value pair with optional verification.", [
                ("name", "string", "The key of a given field's key-value pair"),
                ("value", "string", "The value associated with the name key"),
                ("verified_at", "string", "Timestamp of when the server verified a URL value for a rel=\"me\" link", "date-time", True),
            ]),
            ("Mention", "Represents a mention of a user within the status content.", [
                ("id", "string", "The account id of the mentioned user"),
                ("username", "string", "The username of the mentioned user"),
                ("url", "string", "The location of the mentioned user's profile", "uri"),
                ("acct", "string", "The webfinger acct: URI of the mentioned user"),
            ]),
            ("Tag", "Represents a hashtag used within the status content.", [
                ("name", "string", "The value of the hashtag after the # sign"),
                ("url", "string", "A link to the hashtag on the instance", "uri"),
                ("history", "array", "Usage statistics for given days", False, "TagHistory"),
                ("following", "boolean", "Whether the current token's authorized user is following this tag", False),
            ]),
            ("Poll", "Represents a poll attached to a status.", [
                ("id", "string", "The ID of the poll in the database"),
                ("expires_at", "string", "When the poll ends", "date-time", True),
                ("expired", "boolean", "Is the poll currently expired?"),
                ("multiple", "boolean", "Does the poll allow multiple-choice answers?"),
                ("votes_count", "integer", "How many votes have been received"),
                ("voters_count", "integer", "How many unique accounts have voted on a multiple-choice poll", True),
                ("options", "array", "Possible answers for the poll", False, "PollOption"),
                ("emojis", "array", "Custom emoji to be used for rendering poll options", False, "CustomEmoji"),
                ("voted", "boolean", "When called with a user token, has the authorized user voted?", False),
                ("own_votes", "array", "When called with a user token, which options has the authorized user chosen?", False),
            ]),
            ("PollOption", "Represents a poll choice.", [
                ("title", "string", "The text value of the poll option"),
                ("votes_count", "integer", "The number of received votes for this option", True),
            ]),
            ("Application", "Represents an application that interfaces with the REST API to access accounts or post statuses.", [
                ("name", "string", "The name of your application"),
                ("website", "string", "The website associated with your application", "uri", True),
                ("vapid_key", "string", "Used for Push Streaming API", False),
            ]),
            ("Token", "Represents an OAuth token used for authenticating with the API and performing actions.", [
                ("access_token", "string", "An OAuth token to be used for authorization"),
                ("token_type", "string", "The OAuth token type"),
                ("scope", "string", "The OAuth scopes granted by this token"),
                ("created_at", "integer", "When the token was generated"),
            ]),
            ("Instance", "Represents the software instance of Mastodon running on this domain.", [
                ("uri", "string", "The domain name of the instance"),
                ("title", "string", "The title of the website"),
                ("short_description", "string", "A shorter description defined by the admin"),
                ("description", "string", "A description for the instance"),
                ("email", "string", "An email that may be contacted for any inquiries"),
                ("version", "string", "The version of Mastodon installed on the instance"),
                ("urls", "object", "URLs of interest for clients apps"),
                ("stats", "object", "Statistics about how much information the instance contains"),
                ("thumbnail", "string", "Banner image for the instance", "uri", True),
                ("languages", "array", "Primary languages of the website and its staff"),
                ("registrations", "boolean", "Whether registrations are enabled"),
                ("approval_required", "boolean", "Whether registrations require moderator approval"),
                ("invites_enabled", "boolean", "Whether invites are enabled"),
                ("configuration", "object", "Configured values and limits for this website"),
                ("contact_account", "object", "A user that can be contacted regarding the instance", True),
                ("rules", "array", "An itemized list of rules for this website", False, "Rule"),
            ]),
            ("Error", "Represents an error.", [
                ("error", "string", "The error message"),
                ("error_description", "string", "A longer description of the error", False),
            ]),
            ("Context", "Represents the tree around a given status.", [
                ("ancestors", "array", "Parents in the thread", False, "Status"),
                ("descendants", "array", "Children in the thread", False, "Status"),
            ]),
            ("Conversation", "Represents a conversation with \"direct message\" visibility.", [
                ("id", "string", "Local database ID of the conversation"),
                ("unread", "boolean", "Is the conversation currently marked as unread?"),
                ("accounts", "array", "Participants in the conversation", False, "Account"),
                ("last_status", "object", "The last status in the conversation", True),
            ]),
        ]

        for name, description, props in entities_data:
            entity = EntityInfo(name=name, description=description)
            for prop_data in props:
                prop_name, prop_type, prop_desc = prop_data[0], prop_data[1], prop_data[2]
                prop_format = prop_data[3] if len(prop_data) > 3 and isinstance(prop_data[3], str) else None
                prop_nullable = prop_data[3] if len(prop_data) > 3 and isinstance(prop_data[3], bool) else False
                prop_items_ref = prop_data[4] if len(prop_data) > 4 else None
                
                entity.properties.append(PropertyInfo(
                    name=prop_name,
                    type=prop_type,
                    description=prop_desc,
                    format=prop_format,
                    nullable=prop_nullable,
                    items_ref=prop_items_ref,
                    required=not prop_nullable
                ))
            self.entities[name] = entity

    def create_comprehensive_endpoints(self):
        """Create comprehensive API endpoints based on Mastodon API documentation"""
        
        # Define endpoint groups with their endpoints
        endpoint_groups = {
            "accounts": [
                ("GET", "/api/v1/accounts/{id}", "View account", "View information about a profile"),
                ("GET", "/api/v1/accounts/verify_credentials", "Verify credentials", "Test to make sure that the user token works"),
                ("PATCH", "/api/v1/accounts/update_credentials", "Update credentials", "Update the user's display and preferences"),
                ("GET", "/api/v1/accounts/{id}/statuses", "Get account statuses", "Statuses posted to the given account"),
                ("GET", "/api/v1/accounts/{id}/followers", "Get account followers", "Accounts which follow the given account"),
                ("GET", "/api/v1/accounts/{id}/following", "Get account following", "Accounts which the given account is following"),
                ("POST", "/api/v1/accounts/{id}/follow", "Follow account", "Follow the given account"),
                ("POST", "/api/v1/accounts/{id}/unfollow", "Unfollow account", "Unfollow the given account"),
                ("POST", "/api/v1/accounts/{id}/block", "Block account", "Block the given account"),
                ("POST", "/api/v1/accounts/{id}/unblock", "Unblock account", "Unblock the given account"),
                ("POST", "/api/v1/accounts/{id}/mute", "Mute account", "Mute the given account"),
                ("POST", "/api/v1/accounts/{id}/unmute", "Unmute account", "Unmute the given account"),
                ("GET", "/api/v1/accounts/relationships", "Check relationships", "Find out whether a given account is followed, blocked, muted, etc."),
                ("GET", "/api/v1/accounts/search", "Search accounts", "Search for matching accounts by username or display name"),
            ],
            "statuses": [
                ("GET", "/api/v1/statuses/{id}", "View status", "View information about a status"),
                ("POST", "/api/v1/statuses", "Publish status", "Post a new status"),
                ("DELETE", "/api/v1/statuses/{id}", "Delete status", "Delete one of your own statuses"),
                ("GET", "/api/v1/statuses/{id}/context", "Get status context", "View statuses above and below this status in the thread"),
                ("POST", "/api/v1/statuses/{id}/reblog", "Boost status", "Reshare a status"),
                ("POST", "/api/v1/statuses/{id}/unreblog", "Undo boost", "Undo a reshare of a status"),
                ("POST", "/api/v1/statuses/{id}/favourite", "Favourite status", "Add a status to your favourites list"),
                ("POST", "/api/v1/statuses/{id}/unfavourite", "Undo favourite", "Remove a status from your favourites list"),
                ("POST", "/api/v1/statuses/{id}/bookmark", "Bookmark status", "Privately bookmark a status"),
                ("POST", "/api/v1/statuses/{id}/unbookmark", "Undo bookmark", "Remove a status from your private bookmarks"),
                ("POST", "/api/v1/statuses/{id}/mute", "Mute conversation", "Do not receive notifications for the thread"),
                ("POST", "/api/v1/statuses/{id}/unmute", "Unmute conversation", "Start receiving notifications for the thread again"),
                ("POST", "/api/v1/statuses/{id}/pin", "Pin status", "Pin status to the top of your profile"),
                ("POST", "/api/v1/statuses/{id}/unpin", "Unpin status", "Unpin a status from the top of your profile"),
                ("PUT", "/api/v1/statuses/{id}", "Edit status", "Change the content of a status that has already been published"),
                ("GET", "/api/v1/statuses/{id}/history", "Get status edit history", "Get all known versions of a status in reverse chronological order"),
                ("GET", "/api/v1/statuses/{id}/source", "Get status source", "Obtain the source properties for a status"),
            ],
            "timelines": [
                ("GET", "/api/v1/timelines/home", "Home timeline", "View statuses from followed users"),
                ("GET", "/api/v1/timelines/public", "Public timeline", "Public timeline"),
                ("GET", "/api/v1/timelines/tag/{hashtag}", "Hashtag timeline", "View public statuses containing the given hashtag"),
                ("GET", "/api/v1/timelines/list/{list_id}", "List timeline", "View statuses in the given list timeline"),
            ],
            "notifications": [
                ("GET", "/api/v1/notifications", "Get notifications", "Receive notifications for the current user"),
                ("GET", "/api/v1/notifications/{id}", "Get single notification", "View information about a notification with a given ID"),
                ("POST", "/api/v1/notifications/clear", "Dismiss all notifications", "Clear all notifications from the server"),
                ("POST", "/api/v1/notifications/{id}/dismiss", "Dismiss single notification", "Clear a single notification from the server"),
            ],
            "search": [
                ("GET", "/api/v2/search", "Search", "Search for content in accounts, statuses and hashtags"),
            ],
            "instance": [
                ("GET", "/api/v1/instance", "View server information", "Information about the server"),
                ("GET", "/api/v1/instance/peers", "List of connected domains", "Domains that this instance is aware of"),
                ("GET", "/api/v1/instance/activity", "Weekly activity", "Instance activity over the last 3 months"),
                ("GET", "/api/v1/instance/rules", "View server rules", "Rules that the users of this service should follow"),
                ("GET", "/api/v1/instance/domain_blocks", "View domain blocks", "Obtain a list of domains that have been blocked"),
                ("GET", "/api/v1/instance/extended_description", "View extended description", "Obtain an extended description of this server"),
            ],
            "apps": [
                ("POST", "/api/v1/apps", "Create an application", "Create a new application to obtain OAuth2 credentials"),
                ("GET", "/api/v1/apps/verify_credentials", "Verify your app works", "Confirm that the app's OAuth2 credentials work"),
            ],
            "oauth": [
                ("POST", "/oauth/token", "Obtain a token", "Obtain an access token"),
                ("POST", "/oauth/revoke", "Revoke a token", "Revoke an access token"),
            ],
            "media": [
                ("POST", "/api/v1/media", "Upload media attachment", "Creates an attachment to be used with a new status"),
                ("GET", "/api/v1/media/{id}", "Get media attachment", "Get a media attachment"),
                ("PUT", "/api/v1/media/{id}", "Update media attachment", "Update a MediaAttachment's parameters"),
            ],
            "polls": [
                ("GET", "/api/v1/polls/{id}", "View a poll", "View a poll"),
                ("POST", "/api/v1/polls/{id}/votes", "Vote on a poll", "Submit a vote to a poll"),
            ],
            "lists": [
                ("GET", "/api/v1/lists", "View your lists", "Fetch all lists that the user owns"),
                ("GET", "/api/v1/lists/{id}", "View a single list", "Fetch the list with the given ID"),
                ("POST", "/api/v1/lists", "Create a list", "Create a new list"),
                ("PUT", "/api/v1/lists/{id}", "Update a list", "Change the title of a list"),
                ("DELETE", "/api/v1/lists/{id}", "Delete a list", "Delete a list"),
                ("GET", "/api/v1/lists/{id}/accounts", "View accounts in list", "View accounts in the given list"),
                ("POST", "/api/v1/lists/{id}/accounts", "Add accounts to list", "Add accounts to the given list"),
                ("DELETE", "/api/v1/lists/{id}/accounts", "Remove accounts from list", "Remove accounts from the given list"),
            ],
            "follow_requests": [
                ("GET", "/api/v1/follow_requests", "View pending follow requests", "Pending follow requests"),
                ("POST", "/api/v1/follow_requests/{account_id}/authorize", "Accept follow request", "Accept a follow request"),
                ("POST", "/api/v1/follow_requests/{account_id}/reject", "Reject follow request", "Reject a follow request"),
            ],
            "blocks": [
                ("GET", "/api/v1/blocks", "View blocked users", "View your blocks"),
            ],
            "mutes": [
                ("GET", "/api/v1/mutes", "View muted users", "View your mutes"),
            ],
            "favourites": [
                ("GET", "/api/v1/favourites", "View favourited statuses", "Statuses the user has favourited"),
            ],
            "bookmarks": [
                ("GET", "/api/v1/bookmarks", "View bookmarked statuses", "Statuses the user has bookmarked"),
            ],
        }

        for tag, endpoints in endpoint_groups.items():
            for method, path, summary, description in endpoints:
                endpoint = EndpointInfo(
                    path=path,
                    method=method.lower(),
                    summary=summary,
                    description=description,
                    tags=[tag]
                )

                # Add path parameters
                if "{id}" in path:
                    endpoint.parameters.append(ParameterInfo(
                        name="id",
                        type="string",
                        description="The ID of the resource",
                        required=True,
                        location="path"
                    ))
                if "{account_id}" in path:
                    endpoint.parameters.append(ParameterInfo(
                        name="account_id",
                        type="string",
                        description="The ID of the Account in the database",
                        required=True,
                        location="path"
                    ))
                if "{hashtag}" in path:
                    endpoint.parameters.append(ParameterInfo(
                        name="hashtag",
                        type="string",
                        description="The name of the hashtag",
                        required=True,
                        location="path"
                    ))
                if "{list_id}" in path:
                    endpoint.parameters.append(ParameterInfo(
                        name="list_id",
                        type="string",
                        description="The ID of the List in the database",
                        required=True,
                        location="path"
                    ))

                # Add common query parameters for list endpoints
                if method == "GET" and any(x in path for x in ["timeline", "notifications", "statuses", "followers", "following", "blocks", "mutes", "favourites", "bookmarks"]):
                    endpoint.parameters.extend([
                        ParameterInfo("max_id", "string", "Return results older than this ID", required=False),
                        ParameterInfo("since_id", "string", "Return results newer than this ID", required=False),
                        ParameterInfo("min_id", "string", "Return results immediately newer than this ID", required=False),
                        ParameterInfo("limit", "integer", "Maximum number of results to return. Defaults to 20", required=False),
                    ])

                # Add specific parameters for certain endpoints
                if "update_credentials" in path:
                    endpoint.parameters.extend([
                        ParameterInfo("display_name", "string", "The display name to use for the profile", required=False),
                        ParameterInfo("note", "string", "The account bio", required=False),
                        ParameterInfo("avatar", "string", "Avatar image encoded using multipart/form-data", required=False),
                        ParameterInfo("header", "string", "Header image encoded using multipart/form-data", required=False),
                        ParameterInfo("locked", "boolean", "Whether manual approval of follow requests is required", required=False),
                        ParameterInfo("bot", "boolean", "Whether the account is a bot", required=False),
                        ParameterInfo("discoverable", "boolean", "Whether the account should be shown in the profile directory", required=False),
                    ])

                if path == "/api/v1/statuses" and method == "POST":
                    endpoint.parameters.extend([
                        ParameterInfo("status", "string", "Text content of the status", required=False),
                        ParameterInfo("media_ids", "array", "Array of attachment ids to be attached as media", required=False),
                        ParameterInfo("poll", "object", "Poll to be attached", required=False),
                        ParameterInfo("in_reply_to_id", "string", "ID of the status being replied to", required=False),
                        ParameterInfo("sensitive", "boolean", "Mark status and attached media as sensitive?", required=False),
                        ParameterInfo("spoiler_text", "string", "Text to be shown as a warning or subject before the actual content", required=False),
                        ParameterInfo("visibility", "string", "Visibility of the posted status", required=False),
                        ParameterInfo("language", "string", "ISO 639 language code for this status", required=False),
                        ParameterInfo("scheduled_at", "string", "ISO 8601 Datetime at which to schedule a status", required=False),
                    ])

                # Add appropriate responses
                success_responses = {
                    "accounts": {
                        "verify_credentials": "CredentialAccount",
                        "update_credentials": "CredentialAccount", 
                        "{id}": "Account",
                        "search": "Account",
                        "relationships": "Relationship",
                    },
                    "statuses": {
                        "{id}": "Status",
                        "": "Status",  # POST /statuses
                        "context": "Context",
                        "history": "StatusEdit",
                        "source": "StatusSource",
                    },
                    "notifications": {
                        "": "Notification",
                        "{id}": "Notification",
                    },
                    "instance": {
                        "": "Instance",
                        "rules": "Rule",
                        "activity": "Activity",
                    },
                    "media": {
                        "": "MediaAttachment",
                        "{id}": "MediaAttachment",
                    },
                    "polls": {
                        "{id}": "Poll",
                        "votes": "Poll",
                    },
                    "apps": {
                        "": "Application",
                        "verify_credentials": "Application",
                    },
                    "oauth": {
                        "token": "Token",
                    },
                    "search": {
                        "": "Search",
                    }
                }

                # Determine response schema
                response_schema = None
                if tag in success_responses:
                    path_key = path.split("/")[-1] if "{" not in path.split("/")[-1] else "{id}"
                    if path_key in success_responses[tag]:
                        response_schema = success_responses[tag][path_key]
                    elif "" in success_responses[tag]:
                        response_schema = success_responses[tag][""]

                if method == "GET":
                    if any(x in path for x in ["timeline", "followers", "following", "statuses"]):
                        # Array responses
                        endpoint.responses.append(ResponseInfo("200", "Success"))
                    else:
                        endpoint.responses.append(ResponseInfo("200", "Success", response_schema))
                elif method in ["POST", "PUT", "PATCH"]:
                    if "clear" in path or "dismiss" in path or "authorize" in path or "reject" in path:
                        endpoint.responses.append(ResponseInfo("200", "Success"))
                    else:
                        endpoint.responses.append(ResponseInfo("200", "Success", response_schema))
                elif method == "DELETE":
                    endpoint.responses.append(ResponseInfo("200", "Success"))

                # Add error responses
                endpoint.responses.extend([
                    ResponseInfo("401", "Unauthorized", "Error"),
                    ResponseInfo("404", "Not found", "Error"),
                    ResponseInfo("422", "Unprocessable entity", "Error"),
                ])

                self.endpoints.append(endpoint)

    def generate_openapi_spec(self) -> Dict[str, Any]:
        """Generate comprehensive OpenAPI 3.0 specification"""
        spec = {
            "openapi": "3.0.3",
            "info": {
                "title": "Mastodon API",
                "description": "The Mastodon REST API. Please see https://docs.joinmastodon.org/api/ for more details.",
                "version": "4.3.0",
                "contact": {
                    "name": "Mastodon Project",
                    "url": "https://joinmastodon.org"
                },
                "license": {
                    "name": "AGPL-3.0",
                    "url": "https://github.com/mastodon/mastodon/blob/main/LICENSE"
                }
            },
            "servers": [
                {
                    "url": "https://{instance}",
                    "description": "Mastodon instance",
                    "variables": {
                        "instance": {
                            "default": "mastodon.social",
                            "description": "The domain of your Mastodon instance"
                        }
                    }
                }
            ],
            "paths": {},
            "components": {
                "schemas": {},
                "securitySchemes": {
                    "OAuth2": {
                        "type": "oauth2",
                        "description": "OAuth 2.0 authorization code flow",
                        "flows": {
                            "authorizationCode": {
                                "authorizationUrl": "https://{instance}/oauth/authorize",
                                "tokenUrl": "https://{instance}/oauth/token",
                                "scopes": {
                                    "read": "Read access to account data",
                                    "write": "Write access to account data",
                                    "follow": "Access to manage relationships",
                                    "push": "Access to Web Push API subscriptions"
                                }
                            }
                        }
                    },
                    "BearerAuth": {
                        "type": "http",
                        "scheme": "bearer",
                        "description": "Bearer token authentication"
                    }
                }
            }
        }

        # Add schemas for entities
        for entity_name, entity in self.entities.items():
            properties = {}
            required_props = []

            for prop in entity.properties:
                prop_schema = {
                    "type": prop.type,
                    "description": prop.description
                }

                if prop.format:
                    prop_schema["format"] = prop.format

                if prop.nullable:
                    prop_schema["nullable"] = True

                if prop.type == "array":
                    if prop.items_ref:
                        prop_schema["items"] = {"$ref": f"#/components/schemas/{prop.items_ref}"}
                    else:
                        prop_schema["items"] = {"type": "string"}

                if prop.type == "object" and prop.name in ["account", "status", "application", "poll", "reblog", "last_status", "moved"]:
                    # Reference to other schemas
                    ref_map = {
                        "account": "Account",
                        "status": "Status",
                        "application": "Application", 
                        "poll": "Poll",
                        "reblog": "Status",
                        "last_status": "Status",
                        "moved": "Account"
                    }
                    prop_schema = {"$ref": f"#/components/schemas/{ref_map.get(prop.name, 'object')}"}

                properties[prop.name] = prop_schema

                if prop.required:
                    required_props.append(prop.name)

            spec["components"]["schemas"][entity_name] = {
                "type": "object",
                "description": entity.description,
                "properties": properties
            }

            if required_props:
                spec["components"]["schemas"][entity_name]["required"] = required_props

        # Add paths for endpoints
        for endpoint in self.endpoints:
            # Convert path parameters to OpenAPI format
            openapi_path = endpoint.path.replace("{", "{").replace("}", "}")

            if openapi_path not in spec["paths"]:
                spec["paths"][openapi_path] = {}

            parameters = []
            for param in endpoint.parameters:
                param_schema = {
                    "name": param.name,
                    "in": param.location,
                    "description": param.description,
                    "required": param.required,
                    "schema": {"type": param.type}
                }
                parameters.append(param_schema)

            responses = {}
            for response in endpoint.responses:
                resp_schema = {"description": response.description}
                if response.schema_ref:
                    resp_schema["content"] = {
                        "application/json": {
                            "schema": {"$ref": f"#/components/schemas/{response.schema_ref}"}
                        }
                    }
                responses[response.status_code] = resp_schema

            operation = {
                "summary": endpoint.summary,
                "description": endpoint.description,
                "tags": endpoint.tags,
                "responses": responses
            }

            if parameters:
                operation["parameters"] = parameters

            # Add security except for public endpoints
            if not (endpoint.method == "get" and ("public" in endpoint.path or "instance" in endpoint.path)):
                operation["security"] = [{"BearerAuth": []}]

            spec["paths"][openapi_path][endpoint.method] = operation

        return spec

def main():
    generator = ComprehensiveMastodonGenerator()

    print("Creating comprehensive Mastodon API documentation...")
    generator.create_comprehensive_entities()
    generator.create_comprehensive_endpoints()

    print("Generating OpenAPI specification...")
    spec = generator.generate_openapi_spec()

    # Write to YAML file
    output_file = "mastodon-openapi.yaml"
    with open(output_file, "w") as f:
        yaml.dump(spec, f, default_flow_style=False, sort_keys=False, width=1000)

    # Also write to JSON file
    json_output_file = "mastodon-openapi.json"
    with open(json_output_file, "w") as f:
        json.dump(spec, f, indent=2)

    print(f"OpenAPI specification generated:")
    print(f"  YAML: {output_file}")
    print(f"  JSON: {json_output_file}")
    print(f"Generated {len(generator.entities)} entities and {len(generator.endpoints)} endpoints")

    # Print summary
    print("\nEntities:")
    for name in generator.entities.keys():
        print(f"  - {name}")
    
    print(f"\nEndpoint tags:")
    tags = set()
    for endpoint in generator.endpoints:
        tags.update(endpoint.tags)
    for tag in sorted(tags):
        count = len([e for e in generator.endpoints if tag in e.tags])
        print(f"  - {tag}: {count} endpoints")

if __name__ == "__main__":
    main()