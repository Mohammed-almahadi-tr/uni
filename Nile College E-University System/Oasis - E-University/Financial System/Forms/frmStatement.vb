Imports System.Data.SqlClient
Public Class frmStatement
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
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents DateTimePicker2 As System.Windows.Forms.DateTimePicker
    Friend WithEvents DateTimePicker1 As System.Windows.Forms.DateTimePicker
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents btnClose As System.Windows.Forms.Button
    Friend WithEvents btnShow As System.Windows.Forms.Button
    Friend WithEvents TreeAcc As System.Windows.Forms.TreeView
    Friend WithEvents GroupBox3 As System.Windows.Forms.GroupBox
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmStatement))
        Me.GroupBox2 = New System.Windows.Forms.GroupBox()
        Me.DateTimePicker2 = New System.Windows.Forms.DateTimePicker()
        Me.DateTimePicker1 = New System.Windows.Forms.DateTimePicker()
        Me.Label4 = New System.Windows.Forms.Label()
        Me.Label5 = New System.Windows.Forms.Label()
        Me.btnClose = New System.Windows.Forms.Button()
        Me.btnShow = New System.Windows.Forms.Button()
        Me.GroupBox3 = New System.Windows.Forms.GroupBox()
        Me.TreeAcc = New System.Windows.Forms.TreeView()
        Me.GroupBox2.SuspendLayout()
        Me.SuspendLayout()
        '
        'GroupBox2
        '
        Me.GroupBox2.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox2.Controls.Add(Me.DateTimePicker2)
        Me.GroupBox2.Controls.Add(Me.DateTimePicker1)
        Me.GroupBox2.Controls.Add(Me.Label4)
        Me.GroupBox2.Controls.Add(Me.Label5)
        Me.GroupBox2.Location = New System.Drawing.Point(408, 3)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(252, 71)
        Me.GroupBox2.TabIndex = 73
        Me.GroupBox2.TabStop = False
        Me.GroupBox2.Text = "«·› —…"
        '
        'DateTimePicker2
        '
        Me.DateTimePicker2.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.DateTimePicker2.CustomFormat = "MM/dd/yyyy"
        Me.DateTimePicker2.Format = System.Windows.Forms.DateTimePickerFormat.Custom
        Me.DateTimePicker2.Location = New System.Drawing.Point(6, 46)
        Me.DateTimePicker2.Name = "DateTimePicker2"
        Me.DateTimePicker2.Size = New System.Drawing.Size(192, 20)
        Me.DateTimePicker2.TabIndex = 3
        '
        'DateTimePicker1
        '
        Me.DateTimePicker1.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.DateTimePicker1.CustomFormat = "MM/dd/yyyy"
        Me.DateTimePicker1.Format = System.Windows.Forms.DateTimePickerFormat.Custom
        Me.DateTimePicker1.Location = New System.Drawing.Point(6, 18)
        Me.DateTimePicker1.Name = "DateTimePicker1"
        Me.DateTimePicker1.Size = New System.Drawing.Size(192, 20)
        Me.DateTimePicker1.TabIndex = 2
        '
        'Label4
        '
        Me.Label4.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label4.AutoSize = True
        Me.Label4.Location = New System.Drawing.Point(204, 46)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(28, 13)
        Me.Label4.TabIndex = 1
        Me.Label4.Text = "«·Ì:"
        Me.Label4.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label5
        '
        Me.Label5.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label5.AutoSize = True
        Me.Label5.Location = New System.Drawing.Point(204, 18)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(25, 13)
        Me.Label5.TabIndex = 0
        Me.Label5.Text = "„‰:"
        Me.Label5.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'btnClose
        '
        Me.btnClose.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.btnClose.DialogResult = System.Windows.Forms.DialogResult.Cancel
        Me.btnClose.Location = New System.Drawing.Point(585, 90)
        Me.btnClose.Name = "btnClose"
        Me.btnClose.Size = New System.Drawing.Size(75, 32)
        Me.btnClose.TabIndex = 72
        Me.btnClose.Text = "«€·«ﬁ"
        '
        'btnShow
        '
        Me.btnShow.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.btnShow.Location = New System.Drawing.Point(472, 90)
        Me.btnShow.Name = "btnShow"
        Me.btnShow.Size = New System.Drawing.Size(75, 32)
        Me.btnShow.TabIndex = 71
        Me.btnShow.Text = "⁄—÷"
        '
        'GroupBox3
        '
        Me.GroupBox3.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox3.Location = New System.Drawing.Point(408, 76)
        Me.GroupBox3.Name = "GroupBox3"
        Me.GroupBox3.Size = New System.Drawing.Size(252, 8)
        Me.GroupBox3.TabIndex = 74
        Me.GroupBox3.TabStop = False
        '
        'TreeAcc
        '
        Me.TreeAcc.Anchor = CType((((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.TreeAcc.Font = New System.Drawing.Font("Times New Roman", 12.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.TreeAcc.HideSelection = False
        Me.TreeAcc.Location = New System.Drawing.Point(0, 0)
        Me.TreeAcc.Name = "TreeAcc"
        Me.TreeAcc.Size = New System.Drawing.Size(402, 468)
        Me.TreeAcc.TabIndex = 2
        '
        'frmStatement
        '
        Me.AcceptButton = Me.btnShow
        Me.AutoScaleBaseSize = New System.Drawing.Size(5, 13)
        Me.CancelButton = Me.btnClose
        Me.ClientSize = New System.Drawing.Size(669, 468)
        Me.Controls.Add(Me.TreeAcc)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.btnClose)
        Me.Controls.Add(Me.btnShow)
        Me.Controls.Add(Me.GroupBox3)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.Name = "frmStatement"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.RightToLeftLayout = True
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "ﬂ‘› Õ”«»"
        Me.GroupBox2.ResumeLayout(False)
        Me.GroupBox2.PerformLayout()
        Me.ResumeLayout(False)

    End Sub

#End Region

    Sub FillTree()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select Distinct Acc1 From Transactionees Where Acc1 Is Not Null", cnn)
            Dim Reader, Reader1, Reader2, Reader3 As SqlDataReader
            Dim i, i1, i2, i3 As Integer

            Me.TreeAcc.Nodes.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.TreeAcc.Nodes.Add(Reader.Item(0))
                Dim cmd1 As New SqlCommand("Select Distinct Acc2 From Transactionees Where Acc1=N'" & Reader.Item(0) & "' and Acc2 Is Not Null", cnn1)

                cnn1.Open()
                Reader1 = cmd1.ExecuteReader
                While Reader1.Read
                    Me.TreeAcc.Nodes(i).Nodes.Add(Reader1.Item(0))
                    Dim cmd2 As New SqlCommand("Select Distinct Acc3 From Transactionees Where Acc1=N'" & Reader.Item(0) & "' and " & _
                                               "Acc2=N'" & Reader1.Item(0) & "' and Acc3 Is Not Null", cnn2)

                    cnn2.Open()
                    Reader2 = cmd2.ExecuteReader
                    While Reader2.Read
                        Me.TreeAcc.Nodes(i).Nodes(i1).Nodes.Add(Reader2.Item(0))
                        Dim cmd3 As New SqlCommand("Select Distinct Acc4 From Transactionees Where Acc1=N'" & Reader.Item(0) & "' and " & _
                                                  "Acc2=N'" & Reader1.Item(0) & "' and Acc3=N'" & Reader2.Item(0) & _
                                                  "' and Acc4 Is Not Null", cnn3)

                        cnn3.Open()
                        Reader3 = cmd3.ExecuteReader
                        While Reader3.Read
                            Me.TreeAcc.Nodes(i).Nodes(i1).Nodes(i2).Nodes.Add(Reader3.Item(0))
                        End While
                        cnn3.Close()
                        i2 += 1
                    End While
                    cnn2.Close()
                    i2 = 0
                    i1 += 1
                End While

                cnn1.Close()
                i2 = 0
                i1 = 0
                i += 1
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            If cnn2.State = ConnectionState.Open Then
                cnn2.Close()
            End If
            If cnn3.State = ConnectionState.Open Then
                cnn3.Close()
            End If
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub frmAccTransactions_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillTree()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnClose.Click
        Me.Close()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnShow.Click
        ' Convert(nvarchar, Customers.dade, 102)
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim strSel, Acc1, Acc2, Acc3, Acc4 As String

            If Me.TreeAcc.SelectedNode Is Nothing Then
                Me.Cursor = Cursors.Default
                Exit Sub

            ElseIf Me.TreeAcc.SelectedNode.Level = 0 Then
                Acc1 = Me.TreeAcc.SelectedNode.Text
                strSel = "(select 0 TransNo,N'Open Balance' Descr,'0' TransType,Acc1,N'' Acc2,N'' Acc3,N'' Acc4,0 TotalValueIn,0 TotalValueOut," & _
                         "Sum(TotalValueOut)-sum(TotalValueIn) SNo,'" & DateAdd(DateInterval.Day, -1, Me.DateTimePicker1.Value) & _
                         "' TransDate From Transactionees Where Acc1=N'" & Acc1 & "' and TransDate<N'" & _
                         Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' Group By Acc1) union all " & _
                         "(select MoveNo TransNo,Descr,ChNo TransType,Acc1,Acc2,Acc3,Acc4,TotalValueIn,TotalValueOut,TotalValueOut-TotalValueIn SNo,TransDate " & _
                         "From Transactionees " & _
                         "Where TransDate > N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' " & _
                         "and TransDate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59' and Acc1=N'" & Acc1 & "')"

            ElseIf Me.TreeAcc.SelectedNode.Level = 1 Then
                Acc1 = Me.TreeAcc.SelectedNode.Parent.Text
                Acc2 = Me.TreeAcc.SelectedNode.Text
                strSel = "(select 0 TransNo,N'Open Balance' Descr,'0' TransType,Acc1,Acc2,N'' Acc3,N'' Acc4,0 TotalValueIn,0 TotalValueOut," & _
                         "Sum(TotalValueOut)-sum(TotalValueIn) SNo,'" & DateAdd(DateInterval.Day, -1, Me.DateTimePicker1.Value) & _
                         "' TransDate From Transactionees Where Acc1=N'" & Acc1 & "' and Acc2=N'" & Acc2 & "' and TransDate<N'" & _
                         Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' Group By Acc1,Acc2) union all " & _
                         "(select MoveNo TransNo,Descr,ChNo TransType,Acc1,Acc2,Acc3,Acc4,TotalValueIn,TotalValueOut," & _
                         "TotalValueOut-TotalValueIn SNo,TransDate From Transactionees " & _
                         "Where TransDate > N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' " & _
                         "and transdate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59' " & _
                         "and Acc1=N'" & Acc1 & "' and Acc2=N'" & Acc2 & "')"

            ElseIf Me.TreeAcc.SelectedNode.Level = 2 Then
                Acc1 = Me.TreeAcc.SelectedNode.Parent.Parent.Text
                Acc2 = Me.TreeAcc.SelectedNode.Parent.Text
                Acc3 = Me.TreeAcc.SelectedNode.Text
                strSel = "(select 0 TransNo,N'Open Balance' Descr,'0' TransType,Acc1,Acc2,Acc3,N'' Acc4,0 TotalValueIn,0 TotalValueOut," & _
                         "Sum(TotalValueOut)-sum(TotalValueIn) SNo,'" & DateAdd(DateInterval.Day, -1, Me.DateTimePicker1.Value) & _
                         "' TransDate From Transactionees Where Acc1 =N'" & Acc1 & "' and Acc2=N'" & Acc2 & "' and Acc3=N'" & Acc3 & "' and TransDate<N'" & _
                         Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' Group By Acc1,Acc2,Acc3) Union All " & _
                         "(select MoveNo TransNo,Descr,ChNo TransType,Acc1,Acc2,Acc3,Acc4,TotalValueIn,TotalValueOut," & _
                         "TotalValueOut-TotalValueIn SNo,TransDate From Transactionees " & _
                         "Where TransDate > N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' " & _
                         "and transdate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59' " & _
                         "and Acc1=N'" & Acc1 & "' and Acc2=N'" & Acc2 & "' and Acc3=N'" & Acc3 & "')"

            ElseIf Me.TreeAcc.SelectedNode.Level = 3 Then
                Acc1 = Me.TreeAcc.SelectedNode.Parent.Parent.Parent.Text
                Acc2 = Me.TreeAcc.SelectedNode.Parent.Parent.Text
                Acc3 = Me.TreeAcc.SelectedNode.Parent.Text
                Acc4 = Me.TreeAcc.SelectedNode.Text
                strSel = "(select 0 TransNo,N'Open Balance' Descr,'0' TransType,Acc1,Acc2,Acc3,Acc4,0 TotalValueIn,0 TotalValueOut," & _
                         "Sum(TotalValueOut)-sum(TotalValueIn) SNo,'" & DateAdd(DateInterval.Day, -1, Me.DateTimePicker1.Value) & _
                         "' TransDate From Transactionees Where Acc1 =N'" & Acc1 & "' and Acc2=N'" & Acc2 & "' and Acc3=N'" & Acc3 & _
                         "' and Acc4=N'" & Acc4 & "' and TransDate<N'" & Me.DateTimePicker1.Value.ToShortDateString & _
                         " 00:00:01' Group By Acc1,Acc2,Acc3,Acc4) Union All " & _
                         "(select MoveNo TransNo,Descr,ChNo TransType,Acc1,Acc2,Acc3,Acc4,TotalValueIn,TotalValueOut," & _
                         "TotalValueOut-TotalValueIn SNo,TransDate From Transactionees " & _
                         "Where TransDate > N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' " & _
                         "and transdate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59' " & _
                         "and Acc1=N'" & Acc1 & "' and Acc2=N'" & Acc2 & "' and Acc3=N'" & Acc3 & "' and Acc4=N'" & Acc4 & "')"
            End If

            Dim dap As New SqlDataAdapter(strSel, cnn)
            Dim dasAccStatus As New DataSet

            cnn.Open()
            dasAccStatus.Clear()
            dap.Fill(dasAccStatus, "Transactionees")
            cnn.Close()

            Dim rpt As New Statement
            rpt.SetDataSource(dasAccStatus)
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
End Class
