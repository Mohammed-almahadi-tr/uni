Imports System.Data.SqlClient

Public Class frmBillsArchive

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
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents DateTimePicker1 As System.Windows.Forms.DateTimePicker
    Friend WithEvents DateTimePicker2 As System.Windows.Forms.DateTimePicker
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents GridVouchers As System.Windows.Forms.DataGridView
    Friend WithEvents btnClose As System.Windows.Forms.Button
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents RPayBill As System.Windows.Forms.RadioButton
    Friend WithEvents RGetBill As System.Windows.Forms.RadioButton
    Friend WithEvents GridBills As System.Windows.Forms.DataGridView
    Friend WithEvents Column8 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column1 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column2 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column3 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column4 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column5 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column6 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column9 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column7 As System.Windows.Forms.DataGridViewButtonColumn
    Friend WithEvents GroupBox3 As System.Windows.Forms.GroupBox
    Friend WithEvents RCash As System.Windows.Forms.RadioButton
    Friend WithEvents RBank As System.Windows.Forms.RadioButton
    Friend WithEvents Button3 As System.Windows.Forms.Button
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Dim DataGridViewCellStyle1 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle2 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmBillsArchive))
        Me.GroupBox1 = New System.Windows.Forms.GroupBox()
        Me.DateTimePicker2 = New System.Windows.Forms.DateTimePicker()
        Me.DateTimePicker1 = New System.Windows.Forms.DateTimePicker()
        Me.Label4 = New System.Windows.Forms.Label()
        Me.Label5 = New System.Windows.Forms.Label()
        Me.Button1 = New System.Windows.Forms.Button()
        Me.Button3 = New System.Windows.Forms.Button()
        Me.GridVouchers = New System.Windows.Forms.DataGridView()
        Me.Column8 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column1 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column2 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column3 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column4 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column5 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column6 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column9 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column7 = New System.Windows.Forms.DataGridViewButtonColumn()
        Me.btnClose = New System.Windows.Forms.Button()
        Me.GroupBox2 = New System.Windows.Forms.GroupBox()
        Me.RPayBill = New System.Windows.Forms.RadioButton()
        Me.RGetBill = New System.Windows.Forms.RadioButton()
        Me.GridBills = New System.Windows.Forms.DataGridView()
        Me.GroupBox3 = New System.Windows.Forms.GroupBox()
        Me.RCash = New System.Windows.Forms.RadioButton()
        Me.RBank = New System.Windows.Forms.RadioButton()
        Me.GroupBox1.SuspendLayout()
        CType(Me.GridVouchers, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.GroupBox2.SuspendLayout()
        CType(Me.GridBills, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.GroupBox3.SuspendLayout()
        Me.SuspendLayout()
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.DateTimePicker2)
        Me.GroupBox1.Controls.Add(Me.DateTimePicker1)
        Me.GroupBox1.Controls.Add(Me.Label4)
        Me.GroupBox1.Controls.Add(Me.Label5)
        Me.GroupBox1.Location = New System.Drawing.Point(364, 3)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.RightToLeft = System.Windows.Forms.RightToLeft.No
        Me.GroupBox1.Size = New System.Drawing.Size(485, 48)
        Me.GroupBox1.TabIndex = 64
        Me.GroupBox1.TabStop = False
        Me.GroupBox1.Text = "Period"
        '
        'DateTimePicker2
        '
        Me.DateTimePicker2.Location = New System.Drawing.Point(283, 17)
        Me.DateTimePicker2.Name = "DateTimePicker2"
        Me.DateTimePicker2.Size = New System.Drawing.Size(192, 20)
        Me.DateTimePicker2.TabIndex = 5
        '
        'DateTimePicker1
        '
        Me.DateTimePicker1.Location = New System.Drawing.Point(47, 17)
        Me.DateTimePicker1.Name = "DateTimePicker1"
        Me.DateTimePicker1.Size = New System.Drawing.Size(192, 20)
        Me.DateTimePicker1.TabIndex = 4
        '
        'Label4
        '
        Me.Label4.AutoSize = True
        Me.Label4.Font = New System.Drawing.Font("Tahoma", 8.0!)
        Me.Label4.Location = New System.Drawing.Point(258, 21)
        Me.Label4.Name = "Label4"
        Me.Label4.RightToLeft = System.Windows.Forms.RightToLeft.No
        Me.Label4.Size = New System.Drawing.Size(19, 13)
        Me.Label4.TabIndex = 3
        Me.Label4.Text = "To"
        Me.Label4.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label5
        '
        Me.Label5.AutoSize = True
        Me.Label5.Font = New System.Drawing.Font("Tahoma", 8.0!)
        Me.Label5.Location = New System.Drawing.Point(10, 21)
        Me.Label5.Name = "Label5"
        Me.Label5.RightToLeft = System.Windows.Forms.RightToLeft.No
        Me.Label5.Size = New System.Drawing.Size(31, 13)
        Me.Label5.TabIndex = 2
        Me.Label5.Text = "From"
        Me.Label5.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Button1
        '
        Me.Button1.Font = New System.Drawing.Font("Tahoma", 8.0!)
        Me.Button1.Location = New System.Drawing.Point(855, 11)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 32)
        Me.Button1.TabIndex = 72
        Me.Button1.Text = "Show "
        '
        'Button3
        '
        Me.Button3.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Button3.Font = New System.Drawing.Font("Tahoma", 8.0!)
        Me.Button3.Location = New System.Drawing.Point(801, 393)
        Me.Button3.Name = "Button3"
        Me.Button3.Size = New System.Drawing.Size(75, 32)
        Me.Button3.TabIndex = 74
        Me.Button3.Text = "Print All "
        '
        'GridVouchers
        '
        Me.GridVouchers.AllowUserToAddRows = False
        Me.GridVouchers.AllowUserToDeleteRows = False
        DataGridViewCellStyle1.BackColor = System.Drawing.Color.Khaki
        Me.GridVouchers.AlternatingRowsDefaultCellStyle = DataGridViewCellStyle1
        Me.GridVouchers.Anchor = CType((((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GridVouchers.Columns.AddRange(New System.Windows.Forms.DataGridViewColumn() {Me.Column8, Me.Column1, Me.Column2, Me.Column3, Me.Column4, Me.Column5, Me.Column6, Me.Column9, Me.Column7})
        Me.GridVouchers.Location = New System.Drawing.Point(9, 57)
        Me.GridVouchers.MultiSelect = False
        Me.GridVouchers.Name = "GridVouchers"
        Me.GridVouchers.ReadOnly = True
        Me.GridVouchers.RightToLeft = System.Windows.Forms.RightToLeft.No
        Me.GridVouchers.RowHeadersWidth = 50
        Me.GridVouchers.Size = New System.Drawing.Size(972, 330)
        Me.GridVouchers.TabIndex = 75
        '
        'Column8
        '
        Me.Column8.HeaderText = "Type"
        Me.Column8.Name = "Column8"
        Me.Column8.ReadOnly = True
        Me.Column8.Width = 50
        '
        'Column1
        '
        Me.Column1.FillWeight = 75.0!
        Me.Column1.HeaderText = "No"
        Me.Column1.Name = "Column1"
        Me.Column1.ReadOnly = True
        Me.Column1.Width = 75
        '
        'Column2
        '
        Me.Column2.FillWeight = 150.0!
        Me.Column2.HeaderText = "Pay To"
        Me.Column2.Name = "Column2"
        Me.Column2.ReadOnly = True
        Me.Column2.Width = 150
        '
        'Column3
        '
        Me.Column3.FillWeight = 150.0!
        Me.Column3.HeaderText = "Details"
        Me.Column3.Name = "Column3"
        Me.Column3.ReadOnly = True
        Me.Column3.Width = 150
        '
        'Column4
        '
        Me.Column4.HeaderText = "Cheque No "
        Me.Column4.Name = "Column4"
        Me.Column4.ReadOnly = True
        '
        'Column5
        '
        Me.Column5.HeaderText = "Value"
        Me.Column5.Name = "Column5"
        Me.Column5.ReadOnly = True
        '
        'Column6
        '
        Me.Column6.FillWeight = 74.31472!
        Me.Column6.HeaderText = "Date"
        Me.Column6.Name = "Column6"
        Me.Column6.ReadOnly = True
        Me.Column6.Width = 80
        '
        'Column9
        '
        Me.Column9.HeaderText = "Canceled"
        Me.Column9.Name = "Column9"
        Me.Column9.ReadOnly = True
        Me.Column9.Width = 75
        '
        'Column7
        '
        Me.Column7.HeaderText = "Print "
        Me.Column7.Name = "Column7"
        Me.Column7.ReadOnly = True
        Me.Column7.Width = 75
        '
        'btnClose
        '
        Me.btnClose.Anchor = CType((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.btnClose.Location = New System.Drawing.Point(906, 393)
        Me.btnClose.Name = "btnClose"
        Me.btnClose.Size = New System.Drawing.Size(75, 32)
        Me.btnClose.TabIndex = 113
        Me.btnClose.Text = "Close "
        '
        'GroupBox2
        '
        Me.GroupBox2.Controls.Add(Me.RPayBill)
        Me.GroupBox2.Controls.Add(Me.RGetBill)
        Me.GroupBox2.Location = New System.Drawing.Point(9, 3)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.RightToLeft = System.Windows.Forms.RightToLeft.No
        Me.GroupBox2.Size = New System.Drawing.Size(206, 48)
        Me.GroupBox2.TabIndex = 65
        Me.GroupBox2.TabStop = False
        Me.GroupBox2.Text = "Type "
        '
        'RPayBill
        '
        Me.RPayBill.AutoSize = True
        Me.RPayBill.Checked = True
        Me.RPayBill.Location = New System.Drawing.Point(9, 19)
        Me.RPayBill.Name = "RPayBill"
        Me.RPayBill.Size = New System.Drawing.Size(85, 17)
        Me.RPayBill.TabIndex = 1
        Me.RPayBill.TabStop = True
        Me.RPayBill.Text = "Pay Voucher"
        Me.RPayBill.UseVisualStyleBackColor = True
        '
        'RGetBill
        '
        Me.RGetBill.AutoSize = True
        Me.RGetBill.Location = New System.Drawing.Point(100, 19)
        Me.RGetBill.Name = "RGetBill"
        Me.RGetBill.Size = New System.Drawing.Size(103, 17)
        Me.RGetBill.TabIndex = 0
        Me.RGetBill.Text = "Receipt Voucher"
        Me.RGetBill.UseVisualStyleBackColor = True
        '
        'GridBills
        '
        Me.GridBills.AllowUserToAddRows = False
        Me.GridBills.AllowUserToDeleteRows = False
        DataGridViewCellStyle2.BackColor = System.Drawing.Color.Khaki
        Me.GridBills.AlternatingRowsDefaultCellStyle = DataGridViewCellStyle2
        Me.GridBills.Anchor = CType((((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GridBills.Location = New System.Drawing.Point(9, 57)
        Me.GridBills.MultiSelect = False
        Me.GridBills.Name = "GridBills"
        Me.GridBills.ReadOnly = True
        Me.GridBills.RowHeadersWidth = 50
        Me.GridBills.Size = New System.Drawing.Size(769, 277)
        Me.GridBills.TabIndex = 75
        '
        'GroupBox3
        '
        Me.GroupBox3.Controls.Add(Me.RCash)
        Me.GroupBox3.Controls.Add(Me.RBank)
        Me.GroupBox3.Location = New System.Drawing.Point(221, 3)
        Me.GroupBox3.Name = "GroupBox3"
        Me.GroupBox3.RightToLeft = System.Windows.Forms.RightToLeft.No
        Me.GroupBox3.Size = New System.Drawing.Size(137, 48)
        Me.GroupBox3.TabIndex = 66
        Me.GroupBox3.TabStop = False
        Me.GroupBox3.Text = "Payment Method"
        '
        'RCash
        '
        Me.RCash.AutoSize = True
        Me.RCash.Checked = True
        Me.RCash.Location = New System.Drawing.Point(9, 19)
        Me.RCash.Name = "RCash"
        Me.RCash.Size = New System.Drawing.Size(49, 17)
        Me.RCash.TabIndex = 1
        Me.RCash.TabStop = True
        Me.RCash.Text = "Cash"
        Me.RCash.UseVisualStyleBackColor = True
        '
        'RBank
        '
        Me.RBank.AutoSize = True
        Me.RBank.Location = New System.Drawing.Point(80, 19)
        Me.RBank.Name = "RBank"
        Me.RBank.Size = New System.Drawing.Size(48, 17)
        Me.RBank.TabIndex = 0
        Me.RBank.Text = "Bank"
        Me.RBank.UseVisualStyleBackColor = True
        '
        'frmBillsArchive
        '
        Me.AutoScaleBaseSize = New System.Drawing.Size(5, 13)
        Me.ClientSize = New System.Drawing.Size(990, 432)
        Me.Controls.Add(Me.GroupBox3)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.btnClose)
        Me.Controls.Add(Me.GridVouchers)
        Me.Controls.Add(Me.Button3)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.GroupBox1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.Name = "frmBillsArchive"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.No
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "Pay / Receipt Vouchers Archive"
        Me.WindowState = System.Windows.Forms.FormWindowState.Maximized
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        CType(Me.GridVouchers, System.ComponentModel.ISupportInitialize).EndInit()
        Me.GroupBox2.ResumeLayout(False)
        Me.GroupBox2.PerformLayout()
        CType(Me.GridBills, System.ComponentModel.ISupportInitialize).EndInit()
        Me.GroupBox3.ResumeLayout(False)
        Me.GroupBox3.PerformLayout()
        Me.ResumeLayout(False)

    End Sub

#End Region

    Dim sno As Integer

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim StrSel, PaymentMethod As String
            If Me.RCash.Checked = True Then
                PaymentMethod = "C"
            ElseIf Me.RBank.Checked = True Then
                PaymentMethod = "B"
            End If

            If Me.RGetBill.Checked = True Then
                StrSel = "Select * From Transactions Where TransType=N'Receipt Voucher' and TotalValueOut<>0 and PaymentType=N'" & PaymentMethod & "' " & _
                         "and TransDate > N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' " & _
                         "and Transdate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59'"

            ElseIf Me.RPayBill.Checked = True Then
                StrSel = "Select * From Transactions Where TransType=N'Pay Voucher' and TotalValueIn<>0 and PaymentType=N'" & PaymentMethod & "' " & _
                         "and TransDate > N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' " & _
                         "and Transdate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59'"
            End If

            Dim cmd As New SqlCommand(strSel, cnn)
            Dim Reader As SqlDataReader

            Me.GridVouchers.Rows.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.GridVouchers.Rows.Add(New String() {Reader.Item("PaymentType"), Reader.Item("SNo"), Reader.Item("Source"), Reader.Item("Descr"), Reader.Item("ChNo"), _
                                                       CDbl(CDbl(Reader.Item("TotalValueIn")) + CDbl(Reader.Item("TotalValueOut"))).ToString("N2"), _
                                                       CDate(Reader.Item("TransDate")).ToString("yyyy/MM/dd"), GetStatus(CInt(Reader.Item("Reversed"))), "Print"})
            End While
            cnn.Close()

            'Check Canceled Vouchers
            For Each row As DataGridViewRow In Me.GridVouchers.Rows
                If row.Cells(7).Value = "Canceled" Then
                    row.Cells(7).Style.BackColor = Color.Red
                End If
            Next

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Function GetStatus(ByVal Status As Integer) As String
        If Status = 0 Then
            Return ""
        ElseIf Status = 1 Then
            Return "Canceled"
        End If
    End Function

    Private Sub GridVouchers_CellClick(sender As System.Object, e As System.Windows.Forms.DataGridViewCellEventArgs) Handles GridVouchers.CellClick
        If e.ColumnIndex = 8 Then
            Try
                Me.Cursor = Cursors.WaitCursor

                If Me.RGetBill.Checked = True Then
                    PrintBill("Receipt Voucher", Me.GridVouchers.CurrentRow.Cells(0).Value, CInt(Me.GridVouchers.CurrentRow.Cells(1).Value))

                ElseIf Me.RPayBill.Checked = True Then
                    PrintBill("Pay Voucher", Me.GridVouchers.CurrentRow.Cells(0).Value, CInt(Me.GridVouchers.CurrentRow.Cells(1).Value))
                End If

                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Private Sub Button3_Click(sender As System.Object, e As System.EventArgs) Handles Button3.Click
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim StrSel, PaymentMethod As String
            If Me.RCash.Checked = True Then
                PaymentMethod = "C"
            ElseIf Me.RBank.Checked = True Then
                PaymentMethod = "B"
            End If

            If Me.RGetBill.Checked = True Then
                StrSel = "Select * From Transactions Where TransType=N'Receipt Voucher' and TotalValueOut<>0 and Reversed<>1 and " & _
                         "PaymentType=N'" & PaymentMethod & "' " & _
                         "and TransDate > N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' " & _
                         "and Transdate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59'"

            ElseIf Me.RPayBill.Checked = True Then
                StrSel = "Select * From Transactions Where TransType=N'Pay Voucher' and TotalValueIn<>0 and Reversed<>1 and " & _
                         "PaymentType=N'" & PaymentMethod & "' " & _
                         "and TransDate > N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' " & _
                         "and Transdate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59'"
            End If

            Dim dap As New SqlDataAdapter(StrSel, cnn)
            Dim das As New DataSet

            dap.Fill(das, "Transactions")

            Dim rpt As New BillsArchive
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer2.ReportSource = rpt
            RptViewer.CrystalReportViewer2.RefreshReport()
            RptViewer.ShowDialog()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub RGetBill_CheckedChanged(sender As System.Object, e As System.EventArgs) Handles RGetBill.CheckedChanged
        Me.GridVouchers.Rows.Clear()
    End Sub

    Private Sub RPayBill_CheckedChanged(sender As System.Object, e As System.EventArgs) Handles RPayBill.CheckedChanged
        Me.GridVouchers.Rows.Clear()
    End Sub

    Private Sub DateTimePicker1_ValueChanged(sender As System.Object, e As System.EventArgs) Handles DateTimePicker1.ValueChanged
        Me.GridVouchers.Rows.Clear()
    End Sub

    Private Sub DateTimePicker2_ValueChanged(sender As System.Object, e As System.EventArgs) Handles DateTimePicker2.ValueChanged
        Me.GridVouchers.Rows.Clear()
    End Sub

    Private Sub GridVouchers_CellDoubleClick(sender As Object, e As System.Windows.Forms.DataGridViewCellEventArgs) Handles GridVouchers.CellDoubleClick
        If e.RowIndex > -1 Then
            Try
                Me.Cursor = Cursors.WaitCursor

                If Me.RGetBill.Checked = True Then
                    PrintBill("Receipt Voucher", Me.GridVouchers.CurrentRow.Cells(0).Value, CInt(Me.GridVouchers.CurrentRow.Cells(1).Value))

                ElseIf Me.RPayBill.Checked = True Then
                    PrintBill("Pay Voucher", Me.GridVouchers.CurrentRow.Cells(0).Value, CInt(Me.GridVouchers.CurrentRow.Cells(1).Value))
                End If

                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Private Sub btnClose_Click(sender As System.Object, e As System.EventArgs) Handles btnClose.Click
        Me.Close()
    End Sub

    Private Sub RCash_CheckedChanged(sender As System.Object, e As System.EventArgs) Handles RCash.CheckedChanged
        Me.GridVouchers.Rows.Clear()
    End Sub

    Private Sub RBank_CheckedChanged(sender As System.Object, e As System.EventArgs) Handles RBank.CheckedChanged
        Me.GridVouchers.Rows.Clear()
    End Sub
End Class