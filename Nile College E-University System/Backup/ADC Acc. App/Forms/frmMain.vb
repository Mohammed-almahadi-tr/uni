Imports System.Data.SqlClient
Public Class frmMain
    Inherits System.Windows.Forms.Form

#Region " Windows Form Designer generated code "

    Public Sub New()
        MyBase.New()

        'This call is required by the Windows Form Designer.
        InitializeComponent()

        'Add any initialization after the InitializeComponent() call

    End Sub

    'Form overrides dispose to clean up the component list.
    Protected Overloads Overrides Sub Dispose(ByVal disposing As Boolean)
        If disposing Then
            If Not (components Is Nothing) Then
                components.Dispose()
            End If
        End If
        MyBase.Dispose(disposing)
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    Friend WithEvents MainMenu1 As System.Windows.Forms.MainMenu
    Friend WithEvents Timer1 As System.Windows.Forms.Timer
    Friend WithEvents MenuStrip1 As System.Windows.Forms.MenuStrip
    Friend WithEvents ÂÌﬂ·«·Õ”«»« ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ≈÷«›…Õ”«»ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ≈÷«›…Õ“„…ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ≈÷«›…Õ”«»—∆Ì”ÌToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ≈÷«›…Õ”«»›—⁄ÌToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents Õ–›Õ”«»ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents Õ–›Õ“„…ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents Õ–›Õ”«»—∆Ì”ÌToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents Õ–›Õ”«»›—⁄ÌToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ﬁ«∆„…«·Õ”«»« ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents «·√—’œ…ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents «·⁄„·Ì« «·Õ”«»Ì…ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents «·„” Œœ„Ì‰ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents «· ﬁ«—Ì—ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents „Ì“«‰«·„—«Ã⁄…ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents Õ—ﬂ…«·Õ”«»« ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents «·√—’œ…ToolStripMenuItem1 As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents √—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents  ›«’Ì·«·Õ“„ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripSeparator1 As System.Windows.Forms.ToolStripSeparator
    Friend WithEvents «·„Ì“«‰Ì…ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripMenuItem1 As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripSeparator2 As System.Windows.Forms.ToolStripSeparator
    Friend WithEvents MH As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripMenuItem2 As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripMenuItem3 As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripMenuItem5 As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripSeparator3 As System.Windows.Forms.ToolStripSeparator
    Friend WithEvents MH1 As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ﬁ»÷ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripMenuItem4 As System.Windows.Forms.ToolStripMenuItem
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Me.components = New System.ComponentModel.Container
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmMain))
        Me.MainMenu1 = New System.Windows.Forms.MainMenu(Me.components)
        Me.Timer1 = New System.Windows.Forms.Timer(Me.components)
        Me.MenuStrip1 = New System.Windows.Forms.MenuStrip
        Me.ÂÌﬂ·«·Õ”«»« ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.≈÷«›…Õ”«»ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.≈÷«›…Õ“„…ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.≈÷«›…Õ”«»—∆Ì”ÌToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.≈÷«›…Õ”«»›—⁄ÌToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.Õ–›Õ”«»ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.Õ–›Õ“„…ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.Õ–›Õ”«»—∆Ì”ÌToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.Õ–›Õ”«»›—⁄ÌToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.ToolStripMenuItem2 = New System.Windows.Forms.ToolStripMenuItem
        Me.ﬁ«∆„…«·Õ”«»« ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.«·√—’œ…ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.«·⁄„·Ì« «·Õ”«»Ì…ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.ToolStripMenuItem1 = New System.Windows.Forms.ToolStripMenuItem
        Me.ToolStripMenuItem5 = New System.Windows.Forms.ToolStripMenuItem
        Me.ToolStripMenuItem3 = New System.Windows.Forms.ToolStripMenuItem
        Me.ToolStripSeparator2 = New System.Windows.Forms.ToolStripSeparator
        Me.MH = New System.Windows.Forms.ToolStripMenuItem
        Me.ToolStripSeparator3 = New System.Windows.Forms.ToolStripSeparator
        Me.MH1 = New System.Windows.Forms.ToolStripMenuItem
        Me.ﬁ»÷ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.«·„” Œœ„Ì‰ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.«· ﬁ«—Ì—ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.„Ì“«‰«·„—«Ã⁄…ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.Õ—ﬂ…«·Õ”«»« ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.«·√—’œ…ToolStripMenuItem1 = New System.Windows.Forms.ToolStripMenuItem
        Me.√—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me. ›«’Ì·«·Õ“„ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.ToolStripMenuItem4 = New System.Windows.Forms.ToolStripMenuItem
        Me.ToolStripSeparator1 = New System.Windows.Forms.ToolStripSeparator
        Me.«·„Ì“«‰Ì…ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem
        Me.MenuStrip1.SuspendLayout()
        Me.SuspendLayout()
        '
        'Timer1
        '
        Me.Timer1.Enabled = True
        '
        'MenuStrip1
        '
        Me.MenuStrip1.Items.AddRange(New System.Windows.Forms.ToolStripItem() {Me.ÂÌﬂ·«·Õ”«»« ToolStripMenuItem, Me.«·⁄„·Ì« «·Õ”«»Ì…ToolStripMenuItem, Me.«·„” Œœ„Ì‰ToolStripMenuItem, Me.«· ﬁ«—Ì—ToolStripMenuItem})
        Me.MenuStrip1.Location = New System.Drawing.Point(0, 0)
        Me.MenuStrip1.Name = "MenuStrip1"
        Me.MenuStrip1.Size = New System.Drawing.Size(780, 24)
        Me.MenuStrip1.TabIndex = 0
        Me.MenuStrip1.Text = "MenuStrip1"
        '
        'ÂÌﬂ·«·Õ”«»« ToolStripMenuItem
        '
        Me.ÂÌﬂ·«·Õ”«»« ToolStripMenuItem.DropDownItems.AddRange(New System.Windows.Forms.ToolStripItem() {Me.≈÷«›…Õ”«»ToolStripMenuItem, Me.Õ–›Õ”«»ToolStripMenuItem, Me.ToolStripMenuItem2, Me.ﬁ«∆„…«·Õ”«»« ToolStripMenuItem, Me.«·√—’œ…ToolStripMenuItem})
        Me.ÂÌﬂ·«·Õ”«»« ToolStripMenuItem.Name = "ÂÌﬂ·«·Õ”«»« ToolStripMenuItem"
        Me.ÂÌﬂ·«·Õ”«»« ToolStripMenuItem.Size = New System.Drawing.Size(87, 20)
        Me.ÂÌﬂ·«·Õ”«»« ToolStripMenuItem.Text = "ÂÌﬂ· «·Õ”«»« "
        '
        '≈÷«›…Õ”«»ToolStripMenuItem
        '
        Me.≈÷«›…Õ”«»ToolStripMenuItem.DropDownItems.AddRange(New System.Windows.Forms.ToolStripItem() {Me.≈÷«›…Õ“„…ToolStripMenuItem, Me.≈÷«›…Õ”«»—∆Ì”ÌToolStripMenuItem, Me.≈÷«›…Õ”«»›—⁄ÌToolStripMenuItem})
        Me.≈÷«›…Õ”«»ToolStripMenuItem.Name = "≈÷«›…Õ”«»ToolStripMenuItem"
        Me.≈÷«›…Õ”«»ToolStripMenuItem.Size = New System.Drawing.Size(167, 22)
        Me.≈÷«›…Õ”«»ToolStripMenuItem.Text = "≈÷«›… Õ”«»"
        '
        '≈÷«›…Õ“„…ToolStripMenuItem
        '
        Me.≈÷«›…Õ“„…ToolStripMenuItem.Name = "≈÷«›…Õ“„…ToolStripMenuItem"
        Me.≈÷«›…Õ“„…ToolStripMenuItem.Size = New System.Drawing.Size(168, 22)
        Me.≈÷«›…Õ“„…ToolStripMenuItem.Text = "≈÷«›… Õ“„…"
        '
        '≈÷«›…Õ”«»—∆Ì”ÌToolStripMenuItem
        '
        Me.≈÷«›…Õ”«»—∆Ì”ÌToolStripMenuItem.Name = "≈÷«›…Õ”«»—∆Ì”ÌToolStripMenuItem"
        Me.≈÷«›…Õ”«»—∆Ì”ÌToolStripMenuItem.Size = New System.Drawing.Size(168, 22)
        Me.≈÷«›…Õ”«»—∆Ì”ÌToolStripMenuItem.Text = "≈÷«›… Õ”«» —∆Ì”Ì"
        '
        '≈÷«›…Õ”«»›—⁄ÌToolStripMenuItem
        '
        Me.≈÷«›…Õ”«»›—⁄ÌToolStripMenuItem.Name = "≈÷«›…Õ”«»›—⁄ÌToolStripMenuItem"
        Me.≈÷«›…Õ”«»›—⁄ÌToolStripMenuItem.Size = New System.Drawing.Size(168, 22)
        Me.≈÷«›…Õ”«»›—⁄ÌToolStripMenuItem.Text = "≈÷«›… Õ”«» ›—⁄Ì"
        '
        'Õ–›Õ”«»ToolStripMenuItem
        '
        Me.Õ–›Õ”«»ToolStripMenuItem.DropDownItems.AddRange(New System.Windows.Forms.ToolStripItem() {Me.Õ–›Õ“„…ToolStripMenuItem, Me.Õ–›Õ”«»—∆Ì”ÌToolStripMenuItem, Me.Õ–›Õ”«»›—⁄ÌToolStripMenuItem})
        Me.Õ–›Õ”«»ToolStripMenuItem.Name = "Õ–›Õ”«»ToolStripMenuItem"
        Me.Õ–›Õ”«»ToolStripMenuItem.Size = New System.Drawing.Size(167, 22)
        Me.Õ–›Õ”«»ToolStripMenuItem.Text = "Õ–› Õ”«»"
        '
        'Õ–›Õ“„…ToolStripMenuItem
        '
        Me.Õ–›Õ“„…ToolStripMenuItem.Name = "Õ–›Õ“„…ToolStripMenuItem"
        Me.Õ–›Õ“„…ToolStripMenuItem.Size = New System.Drawing.Size(162, 22)
        Me.Õ–›Õ“„…ToolStripMenuItem.Text = "Õ–› Õ“„…"
        '
        'Õ–›Õ”«»—∆Ì”ÌToolStripMenuItem
        '
        Me.Õ–›Õ”«»—∆Ì”ÌToolStripMenuItem.Name = "Õ–›Õ”«»—∆Ì”ÌToolStripMenuItem"
        Me.Õ–›Õ”«»—∆Ì”ÌToolStripMenuItem.Size = New System.Drawing.Size(162, 22)
        Me.Õ–›Õ”«»—∆Ì”ÌToolStripMenuItem.Text = "Õ–› Õ”«» —∆Ì”Ì"
        '
        'Õ–›Õ”«»›—⁄ÌToolStripMenuItem
        '
        Me.Õ–›Õ”«»›—⁄ÌToolStripMenuItem.Name = "Õ–›Õ”«»›—⁄ÌToolStripMenuItem"
        Me.Õ–›Õ”«»›—⁄ÌToolStripMenuItem.Size = New System.Drawing.Size(162, 22)
        Me.Õ–›Õ”«»›—⁄ÌToolStripMenuItem.Text = "Õ–› Õ”«» ›—⁄Ì"
        '
        'ToolStripMenuItem2
        '
        Me.ToolStripMenuItem2.Name = "ToolStripMenuItem2"
        Me.ToolStripMenuItem2.Size = New System.Drawing.Size(167, 22)
        Me.ToolStripMenuItem2.Text = "≈÷«›… «·√’Ê· «·À«» …"
        '
        'ﬁ«∆„…«·Õ”«»« ToolStripMenuItem
        '
        Me.ﬁ«∆„…«·Õ”«»« ToolStripMenuItem.Name = "ﬁ«∆„…«·Õ”«»« ToolStripMenuItem"
        Me.ﬁ«∆„…«·Õ”«»« ToolStripMenuItem.Size = New System.Drawing.Size(167, 22)
        Me.ﬁ«∆„…«·Õ”«»« ToolStripMenuItem.Text = "ﬁ«∆„… «·Õ”«»« "
        '
        '«·√—’œ…ToolStripMenuItem
        '
        Me.«·√—’œ…ToolStripMenuItem.Name = "«·√—’œ…ToolStripMenuItem"
        Me.«·√—’œ…ToolStripMenuItem.Size = New System.Drawing.Size(167, 22)
        Me.«·√—’œ…ToolStripMenuItem.Text = "«·√—’œ…"
        '
        '«·⁄„·Ì« «·Õ”«»Ì…ToolStripMenuItem
        '
        Me.«·⁄„·Ì« «·Õ”«»Ì…ToolStripMenuItem.DropDownItems.AddRange(New System.Windows.Forms.ToolStripItem() {Me.ToolStripMenuItem1, Me.ToolStripMenuItem5, Me.ToolStripMenuItem3, Me.ToolStripSeparator2, Me.MH, Me.ToolStripSeparator3, Me.MH1, Me.ﬁ»÷ToolStripMenuItem})
        Me.«·⁄„·Ì« «·Õ”«»Ì…ToolStripMenuItem.Name = "«·⁄„·Ì« «·Õ”«»Ì…ToolStripMenuItem"
        Me.«·⁄„·Ì« «·Õ”«»Ì…ToolStripMenuItem.Size = New System.Drawing.Size(97, 20)
        Me.«·⁄„·Ì« «·Õ”«»Ì…ToolStripMenuItem.Text = "«·⁄„·Ì«  «·Õ”«»Ì…"
        '
        'ToolStripMenuItem1
        '
        Me.ToolStripMenuItem1.Name = "ToolStripMenuItem1"
        Me.ToolStripMenuItem1.Size = New System.Drawing.Size(164, 22)
        Me.ToolStripMenuItem1.Text = "≈’œ«— ﬁÌœ ÌÊ„Ì…"
        '
        'ToolStripMenuItem5
        '
        Me.ToolStripMenuItem5.Name = "ToolStripMenuItem5"
        Me.ToolStripMenuItem5.Size = New System.Drawing.Size(164, 22)
        Me.ToolStripMenuItem5.Text = " ⁄œÌ· ﬁÌœ"
        '
        'ToolStripMenuItem3
        '
        Me.ToolStripMenuItem3.Name = "ToolStripMenuItem3"
        Me.ToolStripMenuItem3.Size = New System.Drawing.Size(164, 22)
        Me.ToolStripMenuItem3.Text = "≈Â·«ﬂ «·√’Ê· «·À«» …"
        '
        'ToolStripSeparator2
        '
        Me.ToolStripSeparator2.Name = "ToolStripSeparator2"
        Me.ToolStripSeparator2.Size = New System.Drawing.Size(161, 6)
        '
        'MH
        '
        Me.MH.Name = "MH"
        Me.MH.Size = New System.Drawing.Size(164, 22)
        Me.MH.Text = " —’Ìœ"
        '
        'ToolStripSeparator3
        '
        Me.ToolStripSeparator3.Name = "ToolStripSeparator3"
        Me.ToolStripSeparator3.Size = New System.Drawing.Size(161, 6)
        '
        'MH1
        '
        Me.MH1.Name = "MH1"
        Me.MH1.Size = New System.Drawing.Size(164, 22)
        Me.MH1.Text = "≈ﬁ›«· «·⁄«„ «·„«·Ì"
        '
        'ﬁ»÷ToolStripMenuItem
        '
        Me.ﬁ»÷ToolStripMenuItem.Name = "ﬁ»÷ToolStripMenuItem"
        Me.ﬁ»÷ToolStripMenuItem.Size = New System.Drawing.Size(164, 22)
        Me.ﬁ»÷ToolStripMenuItem.Text = "ﬁ»÷"
        '
        '«·„” Œœ„Ì‰ToolStripMenuItem
        '
        Me.«·„” Œœ„Ì‰ToolStripMenuItem.Name = "«·„” Œœ„Ì‰ToolStripMenuItem"
        Me.«·„” Œœ„Ì‰ToolStripMenuItem.Size = New System.Drawing.Size(89, 20)
        Me.«·„” Œœ„Ì‰ToolStripMenuItem.Text = " €ÌÌ— ﬂ·„… «·”—"
        '
        '«· ﬁ«—Ì—ToolStripMenuItem
        '
        Me.«· ﬁ«—Ì—ToolStripMenuItem.DropDownItems.AddRange(New System.Windows.Forms.ToolStripItem() {Me.„Ì“«‰«·„—«Ã⁄…ToolStripMenuItem, Me.Õ—ﬂ…«·Õ”«»« ToolStripMenuItem, Me.«·√—’œ…ToolStripMenuItem1, Me.√—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem, Me. ›«’Ì·«·Õ“„ToolStripMenuItem, Me.ToolStripMenuItem4, Me.ToolStripSeparator1, Me.«·„Ì“«‰Ì…ToolStripMenuItem})
        Me.«· ﬁ«—Ì—ToolStripMenuItem.Name = "«· ﬁ«—Ì—ToolStripMenuItem"
        Me.«· ﬁ«—Ì—ToolStripMenuItem.Size = New System.Drawing.Size(54, 20)
        Me.«· ﬁ«—Ì—ToolStripMenuItem.Text = "«· ﬁ«—Ì—"
        '
        '„Ì“«‰«·„—«Ã⁄…ToolStripMenuItem
        '
        Me.„Ì“«‰«·„—«Ã⁄…ToolStripMenuItem.Name = "„Ì“«‰«·„—«Ã⁄…ToolStripMenuItem"
        Me.„Ì“«‰«·„—«Ã⁄…ToolStripMenuItem.Size = New System.Drawing.Size(164, 22)
        Me.„Ì“«‰«·„—«Ã⁄…ToolStripMenuItem.Text = "„Ì“«‰ «·„—«Ã⁄…"
        '
        'Õ—ﬂ…«·Õ”«»« ToolStripMenuItem
        '
        Me.Õ—ﬂ…«·Õ”«»« ToolStripMenuItem.Name = "Õ—ﬂ…«·Õ”«»« ToolStripMenuItem"
        Me.Õ—ﬂ…«·Õ”«»« ToolStripMenuItem.Size = New System.Drawing.Size(164, 22)
        Me.Õ—ﬂ…«·Õ”«»« ToolStripMenuItem.Text = "Õ—ﬂ… «·Õ”«»« "
        '
        '«·√—’œ…ToolStripMenuItem1
        '
        Me.«·√—’œ…ToolStripMenuItem1.Name = "«·√—’œ…ToolStripMenuItem1"
        Me.«·√—’œ…ToolStripMenuItem1.Size = New System.Drawing.Size(164, 22)
        Me.«·√—’œ…ToolStripMenuItem1.Text = "«·√—’œ…"
        '
        '√—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem
        '
        Me.√—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem.Name = "√—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem"
        Me.√—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem.Size = New System.Drawing.Size(164, 22)
        Me.√—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem.Text = "ﬁÌÊœ «·ÌÊ„Ì…"
        '
        ' ›«’Ì·«·Õ“„ToolStripMenuItem
        '
        Me. ›«’Ì·«·Õ“„ToolStripMenuItem.Name = " ›«’Ì·«·Õ“„ToolStripMenuItem"
        Me. ›«’Ì·«·Õ“„ToolStripMenuItem.Size = New System.Drawing.Size(164, 22)
        Me. ›«’Ì·«·Õ“„ToolStripMenuItem.Text = " ›«’Ì· «·Õ“„"
        '
        'ToolStripMenuItem4
        '
        Me.ToolStripMenuItem4.Name = "ToolStripMenuItem4"
        Me.ToolStripMenuItem4.Size = New System.Drawing.Size(164, 22)
        Me.ToolStripMenuItem4.Text = "ﬂ‘› «·√’Ê· «·À«» …"
        '
        'ToolStripSeparator1
        '
        Me.ToolStripSeparator1.Name = "ToolStripSeparator1"
        Me.ToolStripSeparator1.Size = New System.Drawing.Size(161, 6)
        '
        '«·„Ì“«‰Ì…ToolStripMenuItem
        '
        Me.«·„Ì“«‰Ì…ToolStripMenuItem.Name = "«·„Ì“«‰Ì…ToolStripMenuItem"
        Me.«·„Ì“«‰Ì…ToolStripMenuItem.Size = New System.Drawing.Size(164, 22)
        Me.«·„Ì“«‰Ì…ToolStripMenuItem.Text = "«·„Ì“«‰Ì…"
        '
        'frmMain
        '
        Me.AutoScaleBaseSize = New System.Drawing.Size(5, 13)
        Me.BackgroundImage = Global.ADC_Acc.App.My.Resources.Resources.BG
        Me.BackgroundImageLayout = System.Windows.Forms.ImageLayout.Stretch
        Me.ClientSize = New System.Drawing.Size(780, 501)
        Me.Controls.Add(Me.MenuStrip1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MainMenuStrip = Me.MenuStrip1
        Me.Menu = Me.MainMenu1
        Me.Name = "frmMain"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "A. A. Almannan Diagnostic Center - „—ﬂ“ «·Õ«Ã ⁄ÿ« «·„‰«‰ «· ‘ŒÌ’Ì - ‰Ÿ«„ «·Õ”«»« " & _
            ""
        Me.WindowState = System.Windows.Forms.FormWindowState.Minimized
        Me.MenuStrip1.ResumeLayout(False)
        Me.MenuStrip1.PerformLayout()
        Me.ResumeLayout(False)
        Me.PerformLayout()

    End Sub
#End Region

    Private Sub MenuItem12_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmAddPack
        a.Show()
    End Sub

    Private Sub MenuItem13_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmAddAcc
        a.Show()
    End Sub

    Private Sub MenuItem14_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmAddSubAcc
        a.Show()
    End Sub

    Private Sub MenuItem10_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmTrialBalance
        a.Show()
    End Sub

    Private Sub MenuItem11_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmAccTransactions
        a.Show()
    End Sub

    Private Sub MenuItem15_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmBillsArchive
        a.Show()
    End Sub

    Private Sub MenuItem19_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmAccStatus
        a.Show()
    End Sub

    Private Sub MenuItem20_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmAccStatus
        a.Show()
    End Sub

    Private Sub Timer1_Tick(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Timer1.Tick
        Me.WindowState = FormWindowState.Maximized
        Me.Timer1.Stop()
    End Sub

    Private Sub MenuItem27_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmPackDetails
        a.Show()
    End Sub

    Private Sub MenuItem26_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmBudget
        a.Show()
    End Sub

    Private Sub MenuItem28_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmDeleteSubAcc
        a.Show()
    End Sub

    Private Sub MenuItem30_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmDeletePack
        a.Show()
    End Sub

    Private Sub MenuItem31_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmDeleteAcc
        a.Show()
    End Sub

    Private Sub frmMain_FormClosed(ByVal sender As Object, ByVal e As System.Windows.Forms.FormClosedEventArgs) Handles Me.FormClosed
        End
    End Sub

    Private Sub MenuItem32_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmBackUp
        a.Show()
    End Sub

    Private Sub ≈÷«›…Õ“„…ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ≈÷«›…Õ“„…ToolStripMenuItem.Click
        Dim a As New frmAddPack
        a.Show()
    End Sub

    Private Sub ≈÷«›…Õ”«»—∆Ì”ÌToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ≈÷«›…Õ”«»—∆Ì”ÌToolStripMenuItem.Click
        Dim a As New frmAddAcc
        a.Show()
    End Sub

    Private Sub ≈÷«›…Õ”«»›—⁄ÌToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ≈÷«›…Õ”«»›—⁄ÌToolStripMenuItem.Click
        Dim a As New frmAddSubAcc
        a.Show()
    End Sub

    Private Sub Õ–›Õ“„…ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Õ–›Õ“„…ToolStripMenuItem.Click
        Dim a As New frmDeletePack
        a.Show()
    End Sub

    Private Sub Õ–›Õ”«»—∆Ì”ÌToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Õ–›Õ”«»—∆Ì”ÌToolStripMenuItem.Click
        Dim a As New frmDeleteAcc
        a.Show()
    End Sub

    Private Sub Õ–›Õ”«»›—⁄ÌToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Õ–›Õ”«»›—⁄ÌToolStripMenuItem.Click
        Dim a As New frmDeleteSubAcc
        a.Show()
    End Sub

    Private Sub ﬁ«∆„…«·Õ”«»« ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ﬁ«∆„…«·Õ”«»« ToolStripMenuItem.Click
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim strSel As String
            strSel = "select * from acc"
            Dim dap As New SqlDataAdapter(strSel, cnn)
            Dim das As New DataSet
            das.Clear()
            cnn1.Open()
            dap.Fill(das, "Acc")
            cnn1.Close()

            Dim rpt As New Acc
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer2.ReportSource = rpt
            RptViewer.CrystalReportViewer2.RefreshReport()
            RptViewer.ShowDialog()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            MsgBox(ex.ToString)
            Try
                cnn1.Close()
            Catch

            End Try
        End Try
    End Sub

    Private Sub «·√—’œ…ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles «·√—’œ…ToolStripMenuItem.Click
        Dim a As New frmAccStatus
        a.Show()
    End Sub

    Private Sub ≈’œ«—”‰œœ›⁄ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmPayBill
        a.Show()
    End Sub

    Private Sub ≈’œ«—”‰œﬁ»÷ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmGetBill
        a.Show()
    End Sub

    Private Sub ≈’œ«—ﬁÌœÌÊ„Ì…ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmDailyChainNew
        a.Show()
    End Sub

    Private Sub ≈÷«›…„” Œœ„ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmEmployees
        a.Show()
    End Sub

    Private Sub Õ–›„” Œœ„ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmDeleteEmpl
        a.Show()
    End Sub

    Private Sub „Ì“«‰«·„—«Ã⁄…ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles „Ì“«‰«·„—«Ã⁄…ToolStripMenuItem.Click
        Dim a As New frmTrialBalance
        a.Show()
    End Sub

    Private Sub Õ—ﬂ…«·Õ”«»« ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Õ—ﬂ…«·Õ”«»« ToolStripMenuItem.Click
        Dim a As New frmAccTransactions
        a.Show()
    End Sub

    Private Sub ”‰œ« «·œ›⁄«·ﬁ»÷ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmBillsArchive
        a.Show()
    End Sub

    Private Sub «·√—’œ…ToolStripMenuItem1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles «·√—’œ…ToolStripMenuItem1.Click
        Dim a As New frmAccStatus
        a.Show()
    End Sub

    Private Sub √—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles √—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem.Click
        Dim a As New frmDailyAccTrans
        a.Show()
    End Sub

    Private Sub  ›«’Ì·«·Õ“„ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles  ›«’Ì·«·Õ“„ToolStripMenuItem.Click
        Dim a As New frmPackDetails
        a.Show()
    End Sub

    Private Sub «·„Ì“«‰Ì…ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles «·„Ì“«‰Ì…ToolStripMenuItem.Click
        Dim a As New frmBalanceSheet
        a.Show()
    End Sub

    Private Sub «·‰”Œ«·≈Õ Ì«ÿÌToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmBackUp
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem1.Click
        Dim a As New frmDailyChainNew
        a.Show()
    End Sub

    Private Sub  —’ÌœToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MH.Click
        Dim a As New frmBalancing
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem2.Click
        Dim a As New frmAddAssets
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem3.Click
        Dim a As New frmDestruction
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem4.Click
        Dim a As New frmAssetsValue
        a.Show()
    End Sub

    Private Sub «·„” Œœ„Ì‰ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles «·„” Œœ„Ì‰ToolStripMenuItem.Click
        Dim a As New frmChangePassword
        a.Show()
    End Sub

    Private Sub frmMain_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select * From Users where SNo=N'" & CurrentUserID & "'", cnnSecurity)
            Dim Reader As SqlDataReader

            cnnSecurity.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.MenuStrip1.Enabled = CBool(CInt(Reader.Item("ChH")))
            End While
            cnnSecurity.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            MsgBox(ex.ToString)
            If cnnSecurity.State = ConnectionState.Open Then
                cnnSecurity.Close()
            End If
        End Try
    End Sub

    Private Sub ToolStripMenuItem5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem5.Click
        Dim a As New frmVoucherEdit
        a.Show()
    End Sub

    Private Sub ≈ﬁ›«·«·⁄«„«·„«·ÌToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MH1.Click
        Dim a As New frmCloseYear
        a.Show()
    End Sub

    Private Sub ﬁ»÷ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ﬁ»÷ToolStripMenuItem.Click
        Dim a As New frmGetBill
        a.Show()
    End Sub

    Private Sub ÂÌﬂ·«·Õ”«»« ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ÂÌﬂ·«·Õ”«»« ToolStripMenuItem.Click
        Dim a As New frmChartofAccounts
        a.Show()
    End Sub
End Class
