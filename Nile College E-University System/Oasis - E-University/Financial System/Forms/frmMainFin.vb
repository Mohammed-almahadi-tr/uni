Imports System.Data.SqlClient
Public Class frmMainFin
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
    Friend WithEvents «·⁄„·Ì« «·Õ”«»Ì…ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents «· ﬁ«—Ì—ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents „Ì“«‰«·„—«Ã⁄…ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents Õ—ﬂ…«·Õ”«»« ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents «·√—’œ…ToolStripMenuItem1 As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents √—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripSeparator1 As System.Windows.Forms.ToolStripSeparator
    Friend WithEvents «·„Ì“«‰Ì…ToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripMenuItem1 As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripSeparator2 As System.Windows.Forms.ToolStripSeparator
    Friend WithEvents MH As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripMenuItem5 As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripMenuItem2 As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripMenuItem3 As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripMenuItem4 As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ≈ﬁ›«·«·⁄«„«·„«·ÌToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripMenuItem7 As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripMenuItem8 As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripMenuItem6 As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripMenuItem9 As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ReceiptVoucherToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ReportsToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents StudentAccountStatementToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents UncollectedFeesToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents FixedAssetsManagementToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents IncomeToolStripMenuItem As System.Windows.Forms.ToolStripMenuItem
    Friend WithEvents ToolStripSeparator4 As System.Windows.Forms.ToolStripSeparator
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Me.components = New System.ComponentModel.Container()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmMainFin))
        Me.MainMenu1 = New System.Windows.Forms.MainMenu(Me.components)
        Me.Timer1 = New System.Windows.Forms.Timer(Me.components)
        Me.MenuStrip1 = New System.Windows.Forms.MenuStrip()
        Me.ÂÌﬂ·«·Õ”«»« ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.«·⁄„·Ì« «·Õ”«»Ì…ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.ToolStripMenuItem1 = New System.Windows.Forms.ToolStripMenuItem()
        Me.ToolStripMenuItem2 = New System.Windows.Forms.ToolStripMenuItem()
        Me.ToolStripMenuItem3 = New System.Windows.Forms.ToolStripMenuItem()
        Me.ToolStripSeparator4 = New System.Windows.Forms.ToolStripSeparator()
        Me.MH = New System.Windows.Forms.ToolStripMenuItem()
        Me.ToolStripSeparator2 = New System.Windows.Forms.ToolStripSeparator()
        Me.ToolStripMenuItem5 = New System.Windows.Forms.ToolStripMenuItem()
        Me.«· ﬁ«—Ì—ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.√—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.„Ì“«‰«·„—«Ã⁄…ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.Õ—ﬂ…«·Õ”«»« ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.«·√—’œ…ToolStripMenuItem1 = New System.Windows.Forms.ToolStripMenuItem()
        Me.ToolStripMenuItem4 = New System.Windows.Forms.ToolStripMenuItem()
        Me.ToolStripSeparator1 = New System.Windows.Forms.ToolStripSeparator()
        Me.«·„Ì“«‰Ì…ToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.ToolStripMenuItem8 = New System.Windows.Forms.ToolStripMenuItem()
        Me.ToolStripMenuItem6 = New System.Windows.Forms.ToolStripMenuItem()
        Me.ToolStripMenuItem9 = New System.Windows.Forms.ToolStripMenuItem()
        Me.ReceiptVoucherToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.ReportsToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.StudentAccountStatementToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.UncollectedFeesToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.IncomeToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.ToolStripMenuItem7 = New System.Windows.Forms.ToolStripMenuItem()
        Me.≈ﬁ›«·«·⁄«„«·„«·ÌToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.FixedAssetsManagementToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.MenuStrip1.SuspendLayout()
        Me.SuspendLayout()
        '
        'Timer1
        '
        Me.Timer1.Enabled = True
        '
        'MenuStrip1
        '
        Me.MenuStrip1.Items.AddRange(New System.Windows.Forms.ToolStripItem() {Me.ÂÌﬂ·«·Õ”«»« ToolStripMenuItem, Me.«·⁄„·Ì« «·Õ”«»Ì…ToolStripMenuItem, Me.«· ﬁ«—Ì—ToolStripMenuItem, Me.ToolStripMenuItem8, Me.ToolStripMenuItem6, Me.ToolStripMenuItem9, Me.ToolStripMenuItem7, Me.≈ﬁ›«·«·⁄«„«·„«·ÌToolStripMenuItem, Me.FixedAssetsManagementToolStripMenuItem})
        Me.MenuStrip1.Location = New System.Drawing.Point(0, 0)
        Me.MenuStrip1.Name = "MenuStrip1"
        Me.MenuStrip1.Size = New System.Drawing.Size(1037, 24)
        Me.MenuStrip1.TabIndex = 0
        Me.MenuStrip1.Text = "MenuStrip1"
        '
        'ÂÌﬂ·«·Õ”«»« ToolStripMenuItem
        '
        Me.ÂÌﬂ·«·Õ”«»« ToolStripMenuItem.Name = "ÂÌﬂ·«·Õ”«»« ToolStripMenuItem"
        Me.ÂÌﬂ·«·Õ”«»« ToolStripMenuItem.Size = New System.Drawing.Size(94, 20)
        Me.ÂÌﬂ·«·Õ”«»« ToolStripMenuItem.Text = "‘Ã—… «·Õ”«»« "
        '
        '«·⁄„·Ì« «·Õ”«»Ì…ToolStripMenuItem
        '
        Me.«·⁄„·Ì« «·Õ”«»Ì…ToolStripMenuItem.DropDownItems.AddRange(New System.Windows.Forms.ToolStripItem() {Me.ToolStripMenuItem1, Me.ToolStripMenuItem2, Me.ToolStripMenuItem3, Me.ToolStripSeparator4, Me.MH, Me.ToolStripSeparator2, Me.ToolStripMenuItem5})
        Me.«·⁄„·Ì« «·Õ”«»Ì…ToolStripMenuItem.Name = "«·⁄„·Ì« «·Õ”«»Ì…ToolStripMenuItem"
        Me.«·⁄„·Ì« «·Õ”«»Ì…ToolStripMenuItem.Size = New System.Drawing.Size(60, 20)
        Me.«·⁄„·Ì« «·Õ”«»Ì…ToolStripMenuItem.Text = "«·”‰œ« "
        '
        'ToolStripMenuItem1
        '
        Me.ToolStripMenuItem1.Name = "ToolStripMenuItem1"
        Me.ToolStripMenuItem1.Size = New System.Drawing.Size(155, 22)
        Me.ToolStripMenuItem1.Text = "ﬁÌœ «·ÌÊ„Ì…"
        '
        'ToolStripMenuItem2
        '
        Me.ToolStripMenuItem2.Name = "ToolStripMenuItem2"
        Me.ToolStripMenuItem2.Size = New System.Drawing.Size(155, 22)
        Me.ToolStripMenuItem2.Text = "«’œ«— ”‰œ œ›⁄"
        '
        'ToolStripMenuItem3
        '
        Me.ToolStripMenuItem3.Name = "ToolStripMenuItem3"
        Me.ToolStripMenuItem3.Size = New System.Drawing.Size(155, 22)
        Me.ToolStripMenuItem3.Text = "«’œ«— ”‰œ ﬁ»÷"
        '
        'ToolStripSeparator4
        '
        Me.ToolStripSeparator4.Name = "ToolStripSeparator4"
        Me.ToolStripSeparator4.Size = New System.Drawing.Size(152, 6)
        '
        'MH
        '
        Me.MH.Enabled = False
        Me.MH.Name = "MH"
        Me.MH.Size = New System.Drawing.Size(155, 22)
        Me.MH.Text = "«· —’Ìœ"
        '
        'ToolStripSeparator2
        '
        Me.ToolStripSeparator2.Name = "ToolStripSeparator2"
        Me.ToolStripSeparator2.Size = New System.Drawing.Size(152, 6)
        '
        'ToolStripMenuItem5
        '
        Me.ToolStripMenuItem5.Name = "ToolStripMenuItem5"
        Me.ToolStripMenuItem5.Size = New System.Drawing.Size(155, 22)
        Me.ToolStripMenuItem5.Text = "⁄ﬂ” ﬁÌœ"
        '
        '«· ﬁ«—Ì—ToolStripMenuItem
        '
        Me.«· ﬁ«—Ì—ToolStripMenuItem.DropDownItems.AddRange(New System.Windows.Forms.ToolStripItem() {Me.√—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem, Me.„Ì“«‰«·„—«Ã⁄…ToolStripMenuItem, Me.Õ—ﬂ…«·Õ”«»« ToolStripMenuItem, Me.«·√—’œ…ToolStripMenuItem1, Me.ToolStripMenuItem4, Me.ToolStripSeparator1, Me.«·„Ì“«‰Ì…ToolStripMenuItem})
        Me.«· ﬁ«—Ì—ToolStripMenuItem.Name = "«· ﬁ«—Ì—ToolStripMenuItem"
        Me.«· ﬁ«—Ì—ToolStripMenuItem.Size = New System.Drawing.Size(54, 20)
        Me.«· ﬁ«—Ì—ToolStripMenuItem.Text = "«· ﬁ«—Ì—"
        '
        '√—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem
        '
        Me.√—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem.Name = "√—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem"
        Me.√—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem.Size = New System.Drawing.Size(189, 22)
        Me.√—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem.Text = "Journal Register"
        '
        '„Ì“«‰«·„—«Ã⁄…ToolStripMenuItem
        '
        Me.„Ì“«‰«·„—«Ã⁄…ToolStripMenuItem.Name = "„Ì“«‰«·„—«Ã⁄…ToolStripMenuItem"
        Me.„Ì“«‰«·„—«Ã⁄…ToolStripMenuItem.Size = New System.Drawing.Size(189, 22)
        Me.„Ì“«‰«·„—«Ã⁄…ToolStripMenuItem.Text = "Trial Balance"
        '
        'Õ—ﬂ…«·Õ”«»« ToolStripMenuItem
        '
        Me.Õ—ﬂ…«·Õ”«»« ToolStripMenuItem.Name = "Õ—ﬂ…«·Õ”«»« ToolStripMenuItem"
        Me.Õ—ﬂ…«·Õ”«»« ToolStripMenuItem.Size = New System.Drawing.Size(189, 22)
        Me.Õ—ﬂ…«·Õ”«»« ToolStripMenuItem.Text = "ﬂ‘› «·Õ”«»« "
        '
        '«·√—’œ…ToolStripMenuItem1
        '
        Me.«·√—’œ…ToolStripMenuItem1.Name = "«·√—’œ…ToolStripMenuItem1"
        Me.«·√—’œ…ToolStripMenuItem1.Size = New System.Drawing.Size(189, 22)
        Me.«·√—’œ…ToolStripMenuItem1.Text = "Balances"
        '
        'ToolStripMenuItem4
        '
        Me.ToolStripMenuItem4.Name = "ToolStripMenuItem4"
        Me.ToolStripMenuItem4.Size = New System.Drawing.Size(189, 22)
        Me.ToolStripMenuItem4.Text = "Pay / Receipt voucher"
        '
        'ToolStripSeparator1
        '
        Me.ToolStripSeparator1.Name = "ToolStripSeparator1"
        Me.ToolStripSeparator1.Size = New System.Drawing.Size(186, 6)
        '
        '«·„Ì“«‰Ì…ToolStripMenuItem
        '
        Me.«·„Ì“«‰Ì…ToolStripMenuItem.Enabled = False
        Me.«·„Ì“«‰Ì…ToolStripMenuItem.Name = "«·„Ì“«‰Ì…ToolStripMenuItem"
        Me.«·„Ì“«‰Ì…ToolStripMenuItem.Size = New System.Drawing.Size(189, 22)
        Me.«·„Ì“«‰Ì…ToolStripMenuItem.Text = "Balance Sheet"
        '
        'ToolStripMenuItem8
        '
        Me.ToolStripMenuItem8.Enabled = False
        Me.ToolStripMenuItem8.Name = "ToolStripMenuItem8"
        Me.ToolStripMenuItem8.Size = New System.Drawing.Size(85, 20)
        Me.ToolStripMenuItem8.Text = "«œ«—… «·‘Ìﬂ« "
        '
        'ToolStripMenuItem6
        '
        Me.ToolStripMenuItem6.Enabled = False
        Me.ToolStripMenuItem6.Name = "ToolStripMenuItem6"
        Me.ToolStripMenuItem6.Size = New System.Drawing.Size(160, 20)
        Me.ToolStripMenuItem6.Text = "«—‘Ì› ”‰œ«  «·œ›⁄ Ê«·ﬁ»÷"
        '
        'ToolStripMenuItem9
        '
        Me.ToolStripMenuItem9.DropDownItems.AddRange(New System.Windows.Forms.ToolStripItem() {Me.ReceiptVoucherToolStripMenuItem, Me.ReportsToolStripMenuItem})
        Me.ToolStripMenuItem9.Name = "ToolStripMenuItem9"
        Me.ToolStripMenuItem9.Size = New System.Drawing.Size(102, 20)
        Me.ToolStripMenuItem9.Text = "Õ”«»«  «·⁄«„·« "
        '
        'ReceiptVoucherToolStripMenuItem
        '
        Me.ReceiptVoucherToolStripMenuItem.Name = "ReceiptVoucherToolStripMenuItem"
        Me.ReceiptVoucherToolStripMenuItem.Size = New System.Drawing.Size(153, 22)
        Me.ReceiptVoucherToolStripMenuItem.Text = "œ›⁄Ì«  «·⁄„·« "
        '
        'ReportsToolStripMenuItem
        '
        Me.ReportsToolStripMenuItem.DropDownItems.AddRange(New System.Windows.Forms.ToolStripItem() {Me.StudentAccountStatementToolStripMenuItem, Me.UncollectedFeesToolStripMenuItem, Me.IncomeToolStripMenuItem})
        Me.ReportsToolStripMenuItem.Name = "ReportsToolStripMenuItem"
        Me.ReportsToolStripMenuItem.Size = New System.Drawing.Size(153, 22)
        Me.ReportsToolStripMenuItem.Text = "«· ﬁ«—Ì—"
        '
        'StudentAccountStatementToolStripMenuItem
        '
        Me.StudentAccountStatementToolStripMenuItem.Name = "StudentAccountStatementToolStripMenuItem"
        Me.StudentAccountStatementToolStripMenuItem.Size = New System.Drawing.Size(212, 22)
        Me.StudentAccountStatementToolStripMenuItem.Text = "ﬂ‘› Õ”«» «·ÿ·«»"
        '
        'UncollectedFeesToolStripMenuItem
        '
        Me.UncollectedFeesToolStripMenuItem.Name = "UncollectedFeesToolStripMenuItem"
        Me.UncollectedFeesToolStripMenuItem.Size = New System.Drawing.Size(212, 22)
        Me.UncollectedFeesToolStripMenuItem.Text = "«·ÿ·«» «·„ Œ·›Ì‰ ⁄‰ «·”œ«œ"
        '
        'IncomeToolStripMenuItem
        '
        Me.IncomeToolStripMenuItem.Name = "IncomeToolStripMenuItem"
        Me.IncomeToolStripMenuItem.Size = New System.Drawing.Size(212, 22)
        Me.IncomeToolStripMenuItem.Text = "«·œŒ·"
        '
        'ToolStripMenuItem7
        '
        Me.ToolStripMenuItem7.Name = "ToolStripMenuItem7"
        Me.ToolStripMenuItem7.Size = New System.Drawing.Size(58, 20)
        Me.ToolStripMenuItem7.Text = "«·„Ì“«‰Ì…"
        '
        '≈ﬁ›«·«·⁄«„«·„«·ÌToolStripMenuItem
        '
        Me.≈ﬁ›«·«·⁄«„«·„«·ÌToolStripMenuItem.Enabled = False
        Me.≈ﬁ›«·«·⁄«„«·„«·ÌToolStripMenuItem.Name = "≈ﬁ›«·«·⁄«„«·„«·ÌToolStripMenuItem"
        Me.≈ﬁ›«·«·⁄«„«·„«·ÌToolStripMenuItem.Size = New System.Drawing.Size(103, 20)
        Me.≈ﬁ›«·«·⁄«„«·„«·ÌToolStripMenuItem.Text = "ﬁ›· «·”‰… «·„«·Ì…"
        '
        'FixedAssetsManagementToolStripMenuItem
        '
        Me.FixedAssetsManagementToolStripMenuItem.Name = "FixedAssetsManagementToolStripMenuItem"
        Me.FixedAssetsManagementToolStripMenuItem.Size = New System.Drawing.Size(111, 20)
        Me.FixedAssetsManagementToolStripMenuItem.Text = "«œ«—… «·«’Ê· «·À«» …"
        '
        'frmMainFin
        '
        Me.AutoScaleBaseSize = New System.Drawing.Size(5, 13)
        Me.BackgroundImageLayout = System.Windows.Forms.ImageLayout.Stretch
        Me.ClientSize = New System.Drawing.Size(1037, 639)
        Me.Controls.Add(Me.MenuStrip1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MainMenuStrip = Me.MenuStrip1
        Me.Menu = Me.MainMenu1
        Me.Name = "frmMainFin"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "‰Ÿ«„ «·Õ”«»« "
        Me.WindowState = System.Windows.Forms.FormWindowState.Minimized
        Me.MenuStrip1.ResumeLayout(False)
        Me.MenuStrip1.PerformLayout()
        Me.ResumeLayout(False)
        Me.PerformLayout()

    End Sub
#End Region

    Private Sub MenuItem10_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmTrialBalance
        a.Show()
    End Sub

    Private Sub MenuItem11_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmStatement
        a.Show()
    End Sub

    Private Sub MenuItem15_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmBillsArchive
        a.Show()
    End Sub

    Private Sub Timer1_Tick(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Timer1.Tick
        Me.WindowState = FormWindowState.Maximized
        Me.Timer1.Stop()
    End Sub

    Private Sub ≈’œ«—”‰œœ›⁄ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmMakePayBill
        a.Show()
    End Sub

    Private Sub ≈’œ«—”‰œﬁ»÷ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmMakeGetBill
        a.Show()
    End Sub

    Private Sub ≈’œ«—ﬁÌœÌÊ„Ì…ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmMakeVoucher
        a.Show()
    End Sub

    Private Sub „Ì“«‰«·„—«Ã⁄…ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles „Ì“«‰«·„—«Ã⁄…ToolStripMenuItem.Click
        Dim a As New frmTrialBalance
        a.Show()
    End Sub

    Private Sub Õ—ﬂ…«·Õ”«»« ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Õ—ﬂ…«·Õ”«»« ToolStripMenuItem.Click
        Dim a As New frmStatement
        a.Show()
    End Sub

    Private Sub ”‰œ« «·œ›⁄«·ﬁ»÷ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmBillsArchive
        a.Show()
    End Sub

    Private Sub «·√—’œ…ToolStripMenuItem1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles «·√—’œ…ToolStripMenuItem1.Click
        Dim a As New frmBalanceSheetLevels
        a.Show()
    End Sub

    Private Sub √—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles √—‘Ì›ﬁÌÊœ«·ÌÊ„Ì…ToolStripMenuItem.Click
        Dim a As New frmVouchersList
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem1.Click
        Dim a As New frmMakeVoucher
        a.Show()
    End Sub

    Private Sub  —’ÌœToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MH.Click
        Dim a As New frmApprovingVouchers
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem5.Click
        Dim a As New frmVoucherReverse
        a.Show()
    End Sub

    Private Sub ﬁ»÷ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmMakeGetBill
        a.Show()
    End Sub

    Private Sub ÂÌﬂ·«·Õ”«»« ToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ÂÌﬂ·«·Õ”«»« ToolStripMenuItem.Click
        Dim a As New frmChartofAccounts
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem2.Click
        Dim a As New frmMakePayBill
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem3.Click
        Dim a As New frmMakeGetBill
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem4.Click
        Dim a As New frmBillsArchive
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem7_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem7.Click
        Dim a As New frmBudget
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem6.Click
        Dim a As New frmBillsArchive
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem8_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem8.Click
        Dim a As New frmCheqClearingSystem
        a.Show()
    End Sub

    Private Sub FixedAssetsManagementToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles FixedAssetsManagementToolStripMenuItem.Click
        Dim a As New frmFixedAssets
        a.Show()
    End Sub

    Private Sub ReceiptVoucherToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ReceiptVoucherToolStripMenuItem.Click
        Dim a As New frmStudantReceiptVoucher
        a.Show()
    End Sub

    Private Sub StudentAccountStatementToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles StudentAccountStatementToolStripMenuItem.Click
        Dim d As New frmStdFinanceStatment
        d.Show()
    End Sub

    Private Sub RegisterationToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmFinRegestration
        a.Show()
    End Sub

    Private Sub UncollectedFeesToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles UncollectedFeesToolStripMenuItem.Click
        Dim a As New frmUncollectedFees
        a.Show()
    End Sub

    Private Sub IncomeToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles IncomeToolStripMenuItem.Click
        Dim a As New frmRptIncome
        a.Show()
    End Sub

    Private Sub ≈ﬁ›«·«·⁄«„«·„«·ÌToolStripMenuItem_Click(sender As System.Object, e As System.EventArgs) Handles ≈ﬁ›«·«·⁄«„«·„«·ÌToolStripMenuItem.Click

    End Sub

    Private Sub frmMainFin_Load(sender As System.Object, e As System.EventArgs) Handles MyBase.Load

    End Sub
End Class
